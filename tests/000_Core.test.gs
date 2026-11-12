/** Core fixture smoke test. */
function test000CoreTemporaryFixture() {
  return withTemporaryTournamentSheets_(function () {
    const players = createPhase1IntegrationPlayers_();
    phase1TestAssert_(getPlayers().length === players.length, 'getPlayers debe leer la fixture temporal.');
    phase1TestAssert_(getConfig().matchesPerPlayer === 3, 'getConfig debe leer la configuración temporal.');
    return { skipped: false, players: players.length };
  });
}
