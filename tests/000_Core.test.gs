/**
 * Core module integration tests are intentionally not run yet.
 * setupTournament/getConfig/getPlayers use SpreadsheetApp and must be tested
 * against a dedicated temporary spreadsheet, never the live tournament.
 */
function test000CoreRequiresSpreadsheetFixture() {
  return { skipped: true, reason: 'Requiere fixture aislado de SpreadsheetApp.' };
}
