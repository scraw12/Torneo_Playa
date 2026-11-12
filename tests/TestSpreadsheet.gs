/**
 * Runs integration tests against temporary sheets with the production sheet names.
 * Existing tournament sheets are renamed for the duration and restored in finally.
 * No production rows are overwritten or copied into the fixtures.
 */
function withTemporaryTournamentSheets_(callback) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('No se pudo obtener el bloqueo para ejecutar tests.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const suffix = '__TEST_BACKUP_' + new Date().getTime();
  const names = Object.keys(SHEETS).map(key => SHEETS[key]);
  const backups = [];
  const fixtureNames = [];
  const properties = PropertiesService.getScriptProperties();
  const originalProperties = properties.getProperties();

  try {
    names.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const backupName = (name + suffix).slice(0, 99);
        sheet.setName(backupName);
        backups.push({ originalName: name, backupName: backupName });
      }
    });

    createTemporaryTournamentSheets_(ss);
    names.forEach(name => fixtureNames.push(name));
    properties.deleteAllProperties();

    return callback(ss);
  } finally {
    fixtureNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) ss.deleteSheet(sheet);
    });
    backups.forEach(item => {
      const sheet = ss.getSheetByName(item.backupName);
      if (sheet) sheet.setName(item.originalName);
    });
    properties.deleteAllProperties();
    if (Object.keys(originalProperties).length) properties.setProperties(originalProperties);
    lock.releaseLock();
  }
}

function createTemporaryTournamentSheets_(ss) {
  const definitions = {
    CONFIG: [['Configuración','Valor'],['Nombre','TEST'],['Fecha',new Date()],['Partidos por player',3],['Courts',2],['Diferencia posiciones',3],['Mínimo de matches',3],['Jugadores ORO',0]],
    JUGADORES: [['Jugador','Activo','Genero','BL']],
    FASE1: [['Partido','Pista','Ronda','Jugador 1','Jugador 2','VS','Jugador 3','Jugador 4','Puntos team 1','Puntos team 2']],
    CLASIFICACION: [['Pos.','Jugador','PJ','V','D','PF','PC','Dif.','% Vict.','Desempate manual']]
  };
  Object.keys(definitions).forEach(name => {
    const sheet = ss.insertSheet(name);
    const rows = definitions[name];
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  });
}

function createPhase1IntegrationPlayers_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PLAYERS);
  const players = ['Test A','Test B','Test C','Test D','Test E','Test F','Test G','Test H'];
  const rows = players.map(name => [name, true, 'Chico', '']);
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return players;
}
