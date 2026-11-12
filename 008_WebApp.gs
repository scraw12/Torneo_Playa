/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function doGet(e) {
  const isAdminRequest = e && e.parameter && String(e.parameter.admin || '') === '1';
  const adminAllowed = false;

  const template = HtmlService.createTemplateFromFile('index');
  template.isAdmin = adminAllowed;
  template.adminRequested = isAdminRequest;

  return template.evaluate()
    .setTitle(isAdminRequest ? 'Administración · Torneo Vóley Playa' : 'Torneo Vóley Playa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getPublicTournamentData() {
  const ss = SpreadsheetApp.getActive();
  const cfg = getConfig();
  const standingsData = readSheetData_(SHEETS.STANDINGS, 11);
  const fase1 = readSheetData_(SHEETS.PHASE1, 10);
  const pairs = readSheetData_(SHEETS.FINAL_PAIRS, 5);
  const eliminatorias = readSheetData_(SHEETS.KNOCKOUT, 8);
  return {
    tournament: {
      name: String(cfg.name || 'Torneo de vóley playa'),
      date: formatPublicDate(cfg.date),
      matchesPerPlayer: cfg.matchesPerPlayer,
      courts: cfg.courts
    },
    classification: standingsData.rows.map(r => ({
      position: r[0], player: r[1], played: r[2], wins: r[3], losses: r[4],
      pointsFor: r[5], pointsAgainst: r[6], diff: r[7], winPct: r[8], manualPosition: r[9], tieStatus: r[10]
    })),
    phase1: fase1.rows.map(r => ({
      id: r[0], court: r[1], round: r[2],
      team1: [r[3], r[4]], team2: [r[6], r[7]],
      score1: r[8], score2: r[9]
    })),
    pairs: pairs.rows.map(r => ({
      competition: r[0], position: r[1], player: r[2], partner: r[3], pairId: r[4]
    })),
    knockout: eliminatorias.rows.map(r => ({
      competition: r[0], round: r[1], id: r[2], pair1: r[3], pair2: r[4],
      score1: r[5], score2: r[6], winner: r[7]
    })),
    generatedAt: new Date().toISOString()
  };
}

function savePublicResult(matchType, matchId, score1, score2) {
  const type = String(matchType || '').toUpperCase();
  const id = String(matchId || '').trim();
  const s1 = Number(score1);
  const s2 = Number(score2);

  if (!id) throw new Error('Partido no válido.');
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0 ||
    !Number.isInteger(s1) || !Number.isInteger(s2)) {
    throw new Error('Introduce dos marcadores enteros válidos.');
  }
  if (s1 === s2) throw new Error('Un partido de vóley no puede quedar empatado.');

  const normalizedType = type === 'KO' || type === 'KNOCKOUT' ? 'ELIMINATORIAS' : type;
  const ss = SpreadsheetApp.getActive();
  const sheetName = normalizedType === 'FASE1' ? SHEETS.PHASE1 :
    normalizedType === 'ELIMINATORIAS' ? SHEETS.KNOCKOUT : null;
  if (!sheetName) throw new Error('Tipo de partido no válido.');

  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('No existe la hoja de partidos.');
  const last = sh.getLastRow();
  if (last < 2) throw new Error('No hay partidos generados.');

  const width = normalizedType === 'FASE1' ? 10 : 8;
  const rows = sh.getRange(2, 1, last - 1, width).getValues();
  let rowIndex = -1;
  if (normalizedType === 'FASE1') {
    rowIndex = rows.findIndex(r => String(r[0]) === id);
  } else if (normalizedType === 'ELIMINATORIAS') {
    rowIndex = rows.findIndex(r => String(r[2]) === id);
  }

  if (rowIndex < 0) throw new Error('No se ha encontrado ese partido.');

  const row = rows[rowIndex];
  if (normalizedType === 'ELIMINATORIAS' &&
    (String(row[3]).includes('PENDIENTE') || String(row[4]).includes('PENDIENTE'))) {
    throw new Error('Completa primero el jugador pendiente antes de guardar el resultado.');
  }

  const rowNumber = rowIndex + 2;
  if (normalizedType === 'FASE1') {
    sh.getRange(rowNumber, 9, 1, 2).setValues([[s1, s2]]);
    updateStandings_();
  } else {
    sh.getRange(rowNumber, 6, 1, 2).setValues([[s1, s2]]);
    const winner = s1 > s2 ? String(row[3]) : String(row[4]);
    sh.getRange(rowNumber, 8).setValue(winner);
    propagateKnockoutWinner_(id, winner);
  }

  return { ok: true, data: getPublicTournamentData() };
}

/**
 * Stores the person who fills a PENDIENTE slot in an elimination match.
 * This is intentionally public so the tournament can be completed from the web.
 */
function savePendingPlayer(sessionToken, matchId, side, playerName) {
  requireAdmin(sessionToken);
  const id = String(matchId || '').trim();
  const slot = Number(side);
  const name = String(playerName || '').trim();

  if (!id) throw new Error('Partido no válido.');
  if (slot !== 1 && slot !== 2) throw new Error('Posición de pareja no válida.');
  if (!name) throw new Error('Escribe el nombre del jugador.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.KNOCKOUT);
  if (!sh || sh.getLastRow() < 2) throw new Error('No hay eliminatorias generadas.');

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
  const rowIndex = rows.findIndex(r => String(r[2]) === id);
  if (rowIndex < 0) throw new Error('No se ha encontrado ese partido.');

  const column = slot === 1 ? 4 : 5;
  const current = String(rows[rowIndex][column - 1] || '');
  if (!current.includes('PENDIENTE')) {
    throw new Error('Ese partido ya no tiene un jugador pendiente en esa posición.');
  }

  const replacement = current.replace(/PENDIENTE/g, name);
  sh.getRange(rowIndex + 2, column).setValue(replacement);

  // If this pending slot comes from the odd player pair generated in ORO_PLATA,
  // persist the assignment there as well so the player's partner is recorded
  // outside the knockout sheet too.
  const finalPairs = ss.getSheetByName(SHEETS.FINAL_PAIRS);
  if (finalPairs && finalPairs.getLastRow() >= 2) {
    const pairRows = finalPairs.getRange(2, 1, finalPairs.getLastRow() - 1, 5).getValues();
    const currentPlayer = current.replace(/\s*\/\s*PENDIENTE\s*$/i, '').trim();
    if (currentPlayer) {
      pairRows.forEach((pairRow, pairIndex) => {
        if (String(pairRow[3]) === 'PENDIENTE' && String(pairRow[2]).trim() === currentPlayer) {
          finalPairs.getRange(pairIndex + 2, 4).setValue(name);
        }
      });
    }
  }

  return { ok: true, data: getPublicTournamentData() };
}

/**
 * When a knockout match is completed, writes its winner into every next-round
 * slot that references this match. This keeps the bracket connected on the web
 * and in the ELIMINATORIAS sheet.
 */
function propagateKnockoutWinner_(matchId, winner) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.KNOCKOUT);
  if (!sh || sh.getLastRow() < 2) return;

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
  const token = `Ganador ${matchId}`;

  rows.forEach((row, index) => {
    let changed = false;
    if (String(row[3]) === token) {
      sh.getRange(index + 2, 4).setValue(winner);
      changed = true;
    }
    if (String(row[4]) === token) {
      sh.getRange(index + 2, 5).setValue(winner);
      changed = true;
    }
  });
}

function adminSaveScoreMultiple(sessionToken, matchType, results) {
  requireAdmin(sessionToken);

  return saveScoreMultiple(
    matchType,
    results
  );
}
function savePublicScoreMultiple(matchType, results) {

  return saveScoreMultiple(
    matchType,
    results
  );
}
function saveScoreMultiple(matchType, results) {
  const type = String(matchType || '').toUpperCase();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('No hay resultados para guardar.');
  }

  const normalizedType = type === 'KO' || type === 'KNOCKOUT' ? 'ELIMINATORIAS' : type;
  const sheetName = normalizedType === 'FASE1' ? SHEETS.PHASE1 :
    normalizedType === 'ELIMINATORIAS' ? SHEETS.KNOCKOUT : null;
  if (!sheetName) throw new Error('Tipo de partido no válido.');

  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) throw new Error('No existe la hoja de partidos.');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('No hay partidos generados.');

  const width = normalizedType === 'FASE1' ? 10 : 8;
  const rows = sh.getRange(2, 1, lastRow - 1, width).getValues();
  const updates = [];
  const seenIds = new Set();

  results.forEach(result => {
    const id = String(result.id || '').trim();
    if (!id) throw new Error('Hay un resultado sin identificador de partido.');
    if (seenIds.has(id)) throw new Error('El partido ' + id + ' aparece duplicado en la petición.');
    seenIds.add(id);

    const s1 = Number(result.score1);
    const s2 = Number(result.score2);
    if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0 || s1 === s2) {
      throw new Error('Marcador no válido en el partido ' + id);
    }

    const rowIndex = normalizedType === 'FASE1'
      ? rows.findIndex(row => String(row[0]) === id)
      : rows.findIndex(row => String(row[2]) === id);
    if (rowIndex < 0) throw new Error('No se ha encontrado el partido ' + id);

    const row = rows[rowIndex];
    if (normalizedType === 'ELIMINATORIAS' &&
        (String(row[3]).includes('PENDIENTE') || String(row[4]).includes('PENDIENTE'))) {
      throw new Error('Completa primero el jugador pendiente en el partido ' + id);
    }

    updates.push({
      id,
      rowIndex,
      score1: s1,
      score2: s2,
      winner: normalizedType === 'ELIMINATORIAS' ? (s1 > s2 ? String(row[3]) : String(row[4])) : ''
    });
  });

  // One batch write for every submitted match.
  if (normalizedType === 'FASE1') {
    const scoreValues = rows.map(row => [row[8], row[9]]);
    updates.forEach(item => { scoreValues[item.rowIndex] = [item.score1, item.score2]; });
    sh.getRange(2, 9, scoreValues.length, 2).setValues(scoreValues);
    updateStandings_();
  } else {
    const resultValues = rows.map(row => [row[5], row[6], row[7]]);
    updates.forEach(item => { resultValues[item.rowIndex] = [item.score1, item.score2, item.winner]; });
    sh.getRange(2, 6, resultValues.length, 3).setValues(resultValues);
    updates.forEach(item => propagateKnockoutWinner_(item.id, item.winner));
  }

  SpreadsheetApp.flush();
  return {
    ok: true,
    savedCount: updates.length,
    savedMatchIds: updates.map(item => item.id),
    data: getPublicTournamentData()
  };
}
