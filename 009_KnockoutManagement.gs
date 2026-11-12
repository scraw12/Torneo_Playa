/** Admin data support and knockout match counters used by the administration view. */
function adminGetKnockoutManagementData(sessionToken) {
  requireAdmin(sessionToken);
  updateKnockoutPlayerCounts_();
  const data = getPublicTournamentData();
  const counts = getKnockoutPlayerCounts_();
  data.players = getPlayers().map(name => ({
    name: name,
    matches: counts[String(name).trim().toLowerCase()] || 0
  }));
  return data;
}

function getTeamPlayerNames_(team) {
  return String(team || '').split(/\s*\/\s*/)
    .map(value => String(value || '').trim())
    .filter(value => value && !/^PENDIENTE$/i.test(value) && !/^Ganador\s+/i.test(value));
}

function getKnockoutPlayerCounts_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.KNOCKOUT);
  const counts = {};
  if (!sh || sh.getLastRow() < 2) return counts;

  sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues().forEach(row => {
    new Set(getTeamPlayerNames_(row[3]).concat(getTeamPlayerNames_(row[4]))).forEach(name => {
      const key = name.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return counts;
}

function updateKnockoutPlayerCounts_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.PLAYERS);
  if (!sh) throw new Error('No existe la hoja JUGADORES.');

  const header = String(sh.getRange(1, 3).getValue() || '').trim();
  if (!header) sh.getRange(1, 3).setValue('Partidos');
  else if (header.toLowerCase() !== 'partidos') {
    throw new Error('La columna C de JUGADORES debe tener la cabecera "Partidos".');
  }

  const last = sh.getLastRow();
  if (last < 2) return;

  const counts = getKnockoutPlayerCounts_();
  const names = sh.getRange(2, 1, last - 1, 1).getValues();
  sh.getRange(2, 3, names.length, 1).setValues(names.map(row => {
    const key = String(row[0] || '').trim().toLowerCase();
    return [key ? (counts[key] || 0) : ''];
  }));
}
