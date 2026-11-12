/**
 * Central test runner. Run this function from the Apps Script editor.
 * Tests that require real Google services are reported as skipped until
 * isolated spreadsheet/service fixtures are implemented.
 */
function runAllModuleTests() {
  const suites = [
    { name: '001 Utils', run: test001Utils },
    { name: '003 Standings', run: test003Standings },
    { name: '004 Final stage', run: test004FinalStage },
    { name: '009 Knockout management', run: test009KnockoutManagement },
    { name: '012 Tournament rules', run: test012TournamentRules },
    { name: '013 Phase 1 BL generator', run: runPhase1BLGeneratorTests },
    { name: '000 Core integration', run: test000CoreRequiresSpreadsheetFixture }
  ];
  const results = [];
  suites.forEach(suite => {
    try {
      const value = suite.run();
      results.push({ suite: suite.name, status: value && value.skipped ? 'SKIPPED' : 'PASSED', details: value || null });
      Logger.log('%s: %s', suite.name, value && value.skipped ? 'SKIPPED' : 'PASSED');
    } catch (error) {
      results.push({ suite: suite.name, status: 'FAILED', error: String(error && error.message || error) });
      Logger.log('%s: FAILED - %s', suite.name, error);
    }
  });
  const failed = results.filter(result => result.status === 'FAILED');
  const summary = { total: results.length, passed: results.filter(x => x.status === 'PASSED').length,
    skipped: results.filter(x => x.status === 'SKIPPED').length, failed: failed.length, results: results };
  Logger.log('MODULE TEST SUMMARY: %s', JSON.stringify(summary));
  if (failed.length) throw new Error(failed.length + ' suites han fallado. Consulta el registro.');
  return summary;
}
