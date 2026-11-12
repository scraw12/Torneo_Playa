/** Unit tests for pure rules helpers in 012_TournamentRules.gs. */
function test012TournamentRules() {
  phase1TestAssert_(normalizeGenderHeader_(' Género ') === 'genero',
    'Debe normalizar cabecera con tilde.');
  phase1TestAssert_(normalizePlayerKey_('  ANNA ') === 'anna',
    'Debe normalizar espacios y mayúsculas.');
  phase1TestAssert_(normalizePlayerGender_('Chica') === 'chica',
    'Debe reconocer Chica.');
  phase1TestAssert_(normalizePlayerGender_('CHICO') === 'chico',
    'Debe reconocer Chico.');
  phase1TestAssert_(normalizePlayerGender_('otro') === '',
    'Debe rechazar valores de género no admitidos.');

  const genders = new Map([
    ['a', 'chica'], ['b', 'chica'], ['c', 'chico'], ['d', 'chico']
  ]);
  phase1TestAssert_(!isPhase1GenderMatchValid_(['A','B'], ['C','D'], genders,
    { rule1: true, rule2: false, rule3: false }),
    'Regla 1 debe impedir GG contra BB.');
  phase1TestAssert_(isPhase1GenderMatchValid_(['A','C'], ['B','D'], genders,
    { rule1: false, rule2: true, rule3: false }),
    'Regla 2 permite equipos con chica en ambos lados.');
}
