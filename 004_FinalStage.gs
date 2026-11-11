/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function doGet(e) {
  const isAdminRequest = e && e.parameter && String(e.parameter.admin || '') === '1';
  const adminAllowed = isAdminRequest && isAdminUser();

  const template = HtmlService.createTemplateFromFile('index');
  template.isAdmin = adminAllowed;
  template.adminRequested = isAdminRequest;

  return template.evaluate()
    .setTitle(adminAllowed ? 'Administración · Torneo Vóley Playa' : 'Torneo Vóley Playa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getPublicTournamentData() {
  const ss = SpreadsheetApp.getActive();
  const cfg = getConfig();
  const standingsData = readSheetData(SHEETS.STANDINGS, 10);
  const fase1 = readSheetData(SHEETS.PHASE1, 10);
  const pairs = readSheetData(SHEETS.FINAL_PAIRS, 5);
  const eliminatorias = readSheetData(SHEETS.KNOCKOUT, 8);

  return {
    tournament: {
      name: String(cfg.name || 'Torneo de vóley playa'),
      date: formatPublicDate(cfg.date),
      matchesPerPlayer: cfg.matchesPerPlayer,
      courts: cfg.courts
    },
    classification: buildPublicClassification_(standingsData.rows),
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

/**
 * Builds the ranking sent to the WebApp and calculates tie status from the
 * sporting criteria, not from the warning cell (which may only be populated
 * in the first row of a tie group in older sheet versions).
 */
function buildPublicClassification_(rows) {
  const ranking = rows.map(r => ({
    position: r[0], player: String(r[1] || '').trim(), played: r[2],
    wins: Number(r[3]) || 0, losses: r[4], pointsFor: Number(r[5]) || 0,
    pointsAgainst: r[6], diff: Number(r[7]) || 0, winPct: r[8],
    manualPosition: r[9] === '' || r[9] == null ? '' : r[9],
    tieGroup: '', tieStatus: ''
  }));

  const groups = {};
  ranking.forEach(player => {
    const key = JSON.stringify([player.wins, player.diff, player.pointsFor]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(player);
  });

  Object.keys(groups).forEach(key => {
    const group = groups[key];
    if (group.length < 2) return;
    const positions = group.map(player => {
      const raw = player.manualPosition;
      if (raw === '' || raw == null) return null;
      const value = Number(raw);
      return Number.isInteger(value) && value > 0 ? value : null;
    });
    const resolved = positions.every(value => value !== null) &&
      new Set(positions).size === positions.length;
    const tieGroup = [group[0].wins, group[0].diff, group[0].pointsFor].join('|');
    group.forEach(player => {
      player.tieGroup = tieGroup;
      player.tieStatus = resolved ? '✓ DESEMPATE RESUELTO' : '⚠️ DESEMPATE PENDIENTE';
    });
  });
  return ranking;
}

/** Saves manual final positions for tied players. Administrator-only. */
function adminSaveManualTieBreaks(entries) {
  requireAdmin();
  if (!Array.isArray(entries)) throw new Error('Los datos de desempate no son válidos.');

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.STANDINGS);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Todavía no existe una clasificación.');
  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const playerRows = new Map();
  const grouped = new Map();

  rows.forEach((row, index) => {
    const playerName = String(row[1] || '').trim();
    if (!playerName) return;
    const key = JSON.stringify([Number(row[3]) || 0, Number(row[7]) || 0, Number(row[5]) || 0]);
    const item = { player: playerName, rowNumber: index + 2, groupKey: key };
    playerRows.set(playerName, item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  const tiedPlayers = new Set();
  grouped.forEach(group => {
    if (group.length > 1) group.forEach(item => tiedPlayers.add(item.player));
  });
  if (!tiedPlayers.size) throw new Error('No hay empates pendientes de resolver en la clasificación.');

  const submitted = new Map();
  entries.forEach(entry => {
    const playerName = String(entry && entry.player || '').trim();
    if (!playerName || !tiedPlayers.has(playerName)) {
      throw new Error('Solo puedes editar posiciones de jugadores que estén empatados. Actualiza la clasificación y vuelve a intentarlo.');
    }
    if (submitted.has(playerName)) throw new Error('Hay un jugador repetido en los datos enviados: ' + playerName);
    const raw = entry.position == null ? '' : String(entry.position).trim();
    if (raw === '') {
      submitted.set(playerName, '');
    } else {
      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('La posición manual de ' + playerName + ' debe ser un número entero positivo.');
      }
      submitted.set(playerName, value);
    }
  });

  // All tie rows are sent together, preventing unnoticed collisions between
  // values in the same group while allowing the same value in another group.
  tiedPlayers.forEach(playerName => {
    if (!submitted.has(playerName)) {
      throw new Error('Falta la posición de ' + playerName + '. Recarga la clasificación antes de guardar.');
    }
  });

  grouped.forEach(group => {
    if (group.length < 2) return;
    const used = new Set();
    group.forEach(item => {
      const value = submitted.get(item.player);
      if (value === '' || value == null) return;
      if (used.has(value)) {
        throw new Error('Las posiciones manuales deben ser distintas dentro de cada grupo empatado. Revisa el grupo de ' + group.map(x => x.player).join(', ') + '.');
      }
      used.add(value);
    });
  });

  submitted.forEach((value, playerName) => {
    const item = playerRows.get(playerName);
    sheet.getRange(item.rowNumber, 10).setValue(value);
  });

  updateStandings();
  return { ok: true, data: getPublicTournamentData() };
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
  const rowIndex = rows.findIndex(r => String(r[2]) === id);
  if (rowIndex < 0) throw new Error('No se ha encontrado ese partido.');

  const row = rows[rowIndex];
  if (normalizedType === 'ELIMINATORIAS' &&
      (String(row[3]).includes('PENDIENTE') || String(row[4]).includes('PENDIENTE'))) {
    throw new Error('Completa primero el jugador pendiente antes de guardar el resultado.');
  }

  const rowNumber = rowIndex + 2;
  if (normalizedType === 'FASE1') {
    sh.getRange(rowNumber, 9, 1, 2).setValues([[s1, s2]]);
    updateStandings();
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
function savePendingPlayer(matchId, side, playerName) {
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
