/** Unit tests for pure knockout management helpers in 009_KnockoutManagement.gs. */
function test009KnockoutManagement() {
  const names = getTeamPlayerNames_('  Alejandro / Marta  ');
  phase1TestAssert_(names.length === 2 && names[0] === 'Alejandro' && names[1] === 'Marta',
    'Debe separar los dos jugadores de una pareja.');
  const pending = getTeamPlayerNames_('Alejandro / PENDIENTE');
  phase1TestAssert_(pending.length === 1 && pending[0] === 'Alejandro',
    'Debe excluir PENDIENTE.');
  const winner = getTeamPlayerNames_('Ganador F1-001 / Marta');
  phase1TestAssert_(winner.length === 1 && winner[0] === 'Marta',
    'Debe excluir referencias a ganador de otra ronda.');
}
