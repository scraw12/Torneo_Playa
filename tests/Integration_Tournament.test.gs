/** End-to-end integration: player fixture -> Phase 1 -> scores -> standings. */
function test002Phase1Integration() {
  return withTemporaryTournamentSheets_(function () {
    const players = createPhase1IntegrationPlayers_();
    const config = getConfig();
    phase1TestAssert_(config.matchesPerPlayer === 4, 'Debe leer 4 partidos por jugador desde CONFIG.');

    generatePhase1();

    const phaseSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PHASE1);
    const matchCount = phaseSheet.getLastRow() - 1;
    phase1TestAssert_(matchCount === 24, '24 jugadores x 4 partidos deben generar 24 partidos.');

    const rows = phaseSheet.getRange(2, 1, matchCount, 10).getValues();
    const appearances = {};
    players.forEach(player => appearances[player] = 0);
    const expected = {};
    players.forEach(player => expected[player] = { played: 0, wins: 0, difference: 0 });
    rows.forEach((row, index) => {
      phase1TestAssert_(row[5] === 'VS', 'La columna VS debe rellenarse en el partido ' + (index + 1) + '.');
      [row[3], row[4], row[6], row[7]].forEach(player => {
        phase1TestAssert_(appearances[player] !== undefined, 'El calendario contiene un jugador desconocido.');
        appearances[player]++;
      });
      phaseSheet.getRange(index + 2, 9, 1, 2).setValues([[21, 15]]);
      [row[3], row[4]].forEach(player => { expected[player].played++; expected[player].wins++; expected[player].difference += 6; });
      [row[6], row[7]].forEach(player => { expected[player].played++; expected[player].difference -= 6; });
    });
    players.forEach(player => {
      phase1TestAssert_(appearances[player] === 4, player + ' debe jugar exactamente 4 partidos.');
    });

    updateStandings();
    const standings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.STANDINGS);
    phase1TestAssert_(standings.getLastRow() === players.length + 1, 'La clasificación debe incluir a los 24 jugadores.');
    const standingsRows = standings.getRange(2, 1, players.length, 10).getValues();
    standingsRows.forEach(row => {
      phase1TestAssert_(row[2] === 4, row[1] + ' debe aparecer con 4 partidos jugados.');
      phase1TestAssert_(row[3] === expected[row[1]].wins, row[1] + ' debe tener las victorias calculadas desde los resultados.');
      phase1TestAssert_(row[7] === expected[row[1]].difference, row[1] + ' debe tener la diferencia de puntos calculada.');
    });
    return { skipped: false, matches: matchCount, players: players.length, standingsRows: standingsRows.length };
  });
}
