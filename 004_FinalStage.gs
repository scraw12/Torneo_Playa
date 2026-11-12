/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */



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
function adminSaveManualTieBreaks(sessionToken, entries) {
  requireAdmin(sessionToken);
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

  updateStandings_();
  return { ok: true, data: getPublicTournamentData() };
}


/**
 * Stores the person who fills a PENDIENTE slot in an elimination match.
 * This is intentionally public so the tournament can be completed from the web.
 */

/**
 * When a knockout match is completed, writes its winner into every next-round
 * slot that references this match. This keeps the bracket connected on the web
 * and in the ELIMINATORIAS sheet.
 */
