/**
 * Automated tests for the Phase 1 constraint-aware generator.
 *
 * Run runPhase1BLGeneratorTests() from the Apps Script editor.
 * These tests use synthetic in-memory data only: they do not read or write
 * spreadsheet sheets, Script Properties, or tournament results.
 *
 * Requires the production functions in 001_Utils.gs, 012_TournamentRules.gs
 * and 013_Phase1BLGenerator.gs to be present in the same Apps Script project.
 */

function runPhase1BLGeneratorTests() {
  const tests = [
    testPhase1BLValidatorIndependentLimits_,
    testPhase1BLValidatorRejectsRepeatedPartnerBL_,
    testPhase1BLValidatorRejectsRepeatedOpponentBL_,
    testPhase1BLPlayersHaveNoOwnLimits_,
    testPhase1GenderRules_,
    testPhase1GenderRule3_,
    testPhase1GeneratorThreeMatches_,
    testPhase1TournamentProfiles_,
    testPhase1ProfileRejectsExcessBL_,
    testPhase1ProfileRejectsWrongMatchCount_,
    testPhase1Generator30PlayersSixGirlsBL_
  ];

  const results = [];
  tests.forEach(test => {
    const started = Date.now();
    try {
      test();
      results.push({ name: test.name, passed: true, ms: Date.now() - started });
      Logger.log('PASS %s (%s ms)', test.name, Date.now() - started);
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        ms: Date.now() - started,
        error: error && error.message ? error.message : String(error)
      });
      Logger.log('FAIL %s: %s', test.name, error);
    }
  });

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  const summary = {
    passed: passed,
    failed: failed,
    total: results.length,
    results: results
  };
  Logger.log('PHASE 1 TEST SUMMARY: %s', JSON.stringify(summary));
  if (failed) {
    throw new Error(failed + ' de ' + results.length +
      ' pruebas han fallado. Consulta el registro de ejecución.');
  }
  return summary;
}

/** Optional stress test for the previously problematic 29-player / 4-match case. */
function runPhase1BLGeneratorStressTests() {
  const started = Date.now();
  phase1TestGeneratedSchedule_(29, 4, ['P1', 'P2', 'P3', 'P4'], {
    rule1: false, rule2: false, rule3: false
  });
  const elapsed = Date.now() - started;
  Logger.log('PASS: 29 jugadores, 4 partidos, 4 BL (%s ms)', elapsed);
  return { passed: true, players: 29, matchesPerPlayer: 4, blPlayers: 4, ms: elapsed };
}

/** A non-BL player may use each BL limit once, independently. */
function testPhase1BLValidatorIndependentLimits_() {
  const bl = phase1TestBLMap_(['B', 'D']);
  const matches = [
    [['A', 'B'], ['C', 'E']], // A uses partner-BL allowance
    [['A', 'F'], ['D', 'G']]  // A uses opponent-BL allowance; F also faces BL only once
  ];
  phase1TestAssert_(validatePhase1BLSchedule_(matches, bl).valid,
    'Los límites de compañero y rival deben ser independientes.');
}

/** The same non-BL player cannot have two BL teammates. */
function testPhase1BLValidatorRejectsRepeatedPartnerBL_() {
  const bl = phase1TestBLMap_(['B', 'D']);
  const matches = [
    [['A', 'B'], ['C', 'E']],
    [['A', 'D'], ['F', 'G']]
  ];
  const result = validatePhase1BLSchedule_(matches, bl);
  phase1TestAssert_(!result.valid && result.reason === 'BL_COMPANERO',
    'Debe detectar dos partidos con compañero BL.');
}

/** The same non-BL player cannot face a BL team twice. */
function testPhase1BLValidatorRejectsRepeatedOpponentBL_() {
  const bl = phase1TestBLMap_(['B', 'D']);
  const matches = [
    [['A', 'C'], ['B', 'E']],
    [['A', 'F'], ['D', 'G']]
  ];
  const result = validatePhase1BLSchedule_(matches, bl);
  phase1TestAssert_(!result.valid && result.reason === 'BL_RIVAL',
    'Debe detectar dos partidos contra equipos con BL.');
}


/** BL players are exempt from both BL-specific counters. */
function testPhase1BLPlayersHaveNoOwnLimits_() {
  const bl = phase1TestBLMap_(['A', 'B', 'C', 'D', 'E', 'F']);
  const matches = [
    [['A', 'B'], ['C', 'D']],
    [['A', 'C'], ['B', 'D']],
    [['A', 'D'], ['B', 'C']]
  ];
  phase1TestAssert_(validatePhase1BLSchedule_(matches, bl).valid,
    'Los jugadores BL no deben tener límites BL propios.');
}

/** Rules 1 and 2 are independent and rule 1 allows mixed-vs-BB. */
function testPhase1GenderRules_() {
  const genders = phase1TestGenderMap_({
    A: 'Chica', B: 'Chica', C: 'Chico', D: 'Chico',
    E: 'Chica', F: 'Chico'
  });
  const ggVsBB = isPhase1GenderMatchValid_(
    ['A', 'B'], ['C', 'D'], genders,
    { rule1: true, rule2: false, rule3: false }
  );
  phase1TestAssert_(!ggVsBB, 'Regla 1 debe impedir GG contra BB.');

  const mixedVsBBWithRule1 = isPhase1GenderMatchValid_(
    ['A', 'C'], ['D', 'F'], genders,
    { rule1: true, rule2: false, rule3: false }
  );
  phase1TestAssert_(mixedVsBBWithRule1,
    'Regla 1 por sí sola debe permitir equipo mixto contra BB.');

  const mixedVsBBWithRule2 = isPhase1GenderMatchValid_(
    ['A', 'C'], ['D', 'F'], genders,
    { rule1: false, rule2: true, rule3: false }
  );
  phase1TestAssert_(!mixedVsBBWithRule2,
    'Regla 2 debe impedir equipo con chica contra BB.');
}

/** Rule 3 is a whole-schedule requirement, not a per-match restriction. */
function testPhase1GenderRule3_() {
  const genders = phase1TestGenderMap_({
    A: 'Chica', B: 'Chica', C: 'Chica', D: 'Chica',
    E: 'Chica', F: 'Chica', G: 'Chico', H: 'Chico'
  });
  const rules = { rule1: false, rule2: false, rule3: true };
  const valid = validatePhase1GenderSchedule_(
    [[['A', 'B'], ['C', 'D']], [['E', 'G'], ['F', 'H']]],
    genders, rules
  );
  phase1TestAssert_(!valid.valid && valid.reason === 'REGLA_3',
    'Regla 3 debe detectar chicas sin ningún partido GG contra GG.');

  const invalidGirls = valid.players || [];
  phase1TestAssert_(invalidGirls.indexOf('e') >= 0 && invalidGirls.indexOf('f') >= 0,
    'La validación debe identificar las chicas que no han jugado GG contra GG.');
}



/** Realistic tournament profiles: BL caps and matches/player by group size. */
function testPhase1TournamentProfiles_() {
  [
    { players: 24, bl: 4, matches: 4 },
    { players: 29, bl: 4, matches: 4 },
    { players: 30, bl: 5, matches: 4 },
    { players: 35, bl: 5, matches: 4 },
    { players: 36, bl: 6, matches: 3 },
    { players: 40, bl: 6, matches: 3 }
  ].forEach(scenario => {
    const blMap = new Map();
    for (let i = 1; i <= scenario.players; i++) {
      blMap.set('p' + i, i <= scenario.bl);
    }
    const result = validatePhase1TournamentProfile_(
      scenario.players, scenario.matches, blMap
    );
    phase1TestAssert_(result.valid,
      'Perfil rechazado incorrectamente: ' + JSON.stringify(scenario));
  });
  // Fuera de los tramos definidos no se impone un rango de jugadores.
  phase1TestAssert_(
    validatePhase1TournamentProfile_(23, 5, new Map()).valid &&
    validatePhase1TournamentProfile_(41, 5, new Map()).valid,
    'No debe imponerse un rango obligatorio de jugadores.'
  );
}

function testPhase1ProfileRejectsExcessBL_() {
  const blMap = new Map();
  for (let i = 1; i <= 30; i++) blMap.set('p' + i, i <= 6);
  let message = '';
  try {
    validatePhase1TournamentProfile_(30, 4, blMap);
  } catch (error) {
    message = String(error.message || error);
  }
  phase1TestAssert_(message.indexOf('BL_COUNT_EXCEEDED:') === 0,
    'Debe devolver BL_COUNT_EXCEEDED al superar el máximo de BL.');
}

function testPhase1ProfileRejectsWrongMatchCount_() {
  let message = '';
  try {
    validatePhase1TournamentProfile_(36, 4, new Map());
  } catch (error) {
    message = String(error.message || error);
  }
  phase1TestAssert_(message.indexOf('MATCH_COUNT_NOT_ALLOWED:') === 0,
    'Debe devolver MATCH_COUNT_NOT_ALLOWED si no son 3 partidos en 36-40 jugadores.');
}

/** Exact regression scenario: 30 players, 4 matches, 6 girls (2 BL), 3 BL total. */
function testPhase1Generator30PlayersSixGirlsBL_() {
  const players = [];
  for (let i = 1; i <= 30; i++) players.push('P' + i);
  const girls = {};
  for (let i = 1; i <= 6; i++) girls['P' + i] = 'Chica';
  const genderMap = phase1TestGenderMap_(girls);
  const blMap = phase1TestBLMap_(['P1', 'P2', 'P30']);
  const rules = { rule1: true, rule2: false, rule3: true };
  const schedule = generatePhase1ConstraintAware_(
    players, 4, genderMap, rules, blMap
  );
  phase1TestAssert_(Array.isArray(schedule),
    'No se ha generado calendario para 30 jugadores, 6 chicas y 3 BL.');
  phase1TestAssert_(schedule.length === 30,
    'El escenario de 30 jugadores debe generar exactamente 30 partidos.');
  phase1TestAssert_(validatePhase1GenderSchedule_(schedule, genderMap, rules).valid,
    'El calendario no cumple las reglas de género del escenario real.');
  phase1TestAssert_(validatePhase1BLSchedule_(schedule, blMap).valid,
    'El calendario no cumple las restricciones BL del escenario real.');
  const appearances = new Map(players.map(player => [player, 0]));
  const partners = new Set();
  schedule.forEach(match => {
    match[0].concat(match[1]).forEach(player =>
      appearances.set(player, appearances.get(player) + 1)
    );
    [match[0], match[1]].forEach(team => {
      const key = pairKey(team[0], team[1]);
      phase1TestAssert_(!partners.has(key), 'Se repite la pareja ' + key);
      partners.add(key);
    });
  });
  players.forEach(player => phase1TestAssert_(appearances.get(player) === 4,
    player + ' no tiene exactamente 4 partidos.'));
}

/** Generate and validate 3 matches per player with no BL players. */
function testPhase1GeneratorThreeMatches_() {
  phase1TestGeneratedSchedule_(12, 3, [], {
    rule1: false, rule2: false, rule3: false
  });
}

/** Generate and validate 4 matches per player with a few BL players. */
function testPhase1GeneratorFourMatches_() {
  phase1TestGeneratedSchedule_(12, 4, ['P1', 'P5'], {
    rule1: false, rule2: false, rule3: false
  });
}

/** Generate and validate 5 matches per player with several BL players. */
function testPhase1GeneratorFiveMatches_() {
  phase1TestGeneratedSchedule_(12, 5, ['P1', 'P2', 'P3', 'P4'], {
    rule1: false, rule2: false, rule3: false
  });
}

function phase1TestGeneratedSchedule_(playerCount, matchesPerPlayer, blPlayers, genderRules) {
  const players = [];
  for (let i = 1; i <= playerCount; i++) players.push('P' + i);
  const blMap = phase1TestBLMap_(blPlayers);
  const genderMap = phase1TestGenderMap_({});
  const schedule = generatePhase1ConstraintAware_(
    players, matchesPerPlayer, genderMap, genderRules, blMap
  );

  phase1TestAssert_(Array.isArray(schedule),
    'El generador no ha encontrado calendario en el escenario de prueba.');
  phase1TestAssert_(schedule.length === playerCount * matchesPerPlayer / 4,
    'El número total de partidos no coincide con las apariciones configuradas.');

  const counts = {};
  const pairs = new Set();
  players.forEach(player => counts[player] = 0);
  schedule.forEach((match, index) => {
    phase1TestAssert_(match.length === 2 && match[0].length === 2 && match[1].length === 2,
      'El partido ' + (index + 1) + ' no tiene formato 2 contra 2.');
    const participants = match[0].concat(match[1]);
    phase1TestAssert_(new Set(participants).size === 4,
      'Un jugador aparece dos veces en el mismo partido.');
    participants.forEach(player => {
      phase1TestAssert_(Object.prototype.hasOwnProperty.call(counts, player),
        'El calendario contiene un jugador desconocido: ' + player);
      counts[player]++;
    });
    [match[0], match[1]].forEach(team => {
      const key = pairKey(team[0], team[1]);
      phase1TestAssert_(!pairs.has(key), 'Se ha repetido la pareja ' + key);
      pairs.add(key);
    });
  });

  players.forEach(player => {
    phase1TestAssert_(counts[player] === matchesPerPlayer,
      player + ' tiene ' + counts[player] + ' partidos; se esperaban ' + matchesPerPlayer + '.');
  });
  phase1TestAssert_(validatePhase1BLSchedule_(schedule, blMap).valid,
    'El calendario generado incumple las restricciones BL.');
  phase1TestAssert_(validatePhase1GenderSchedule_(schedule, genderMap, genderRules).valid,
    'El calendario generado incumple las reglas de género.');
}

function phase1TestBLMap_(blPlayers) {
  const selected = new Set(blPlayers || []);
  const map = new Map();
  for (let i = 1; i <= 30; i++) {
    const player = 'P' + i;
    map.set(normalizePlayerKey_(player), selected.has(player));
  }
  ['A','B','C','D','E','F','G','H'].forEach(player => {
    map.set(normalizePlayerKey_(player), selected.has(player));
  });
  return map;
}

function phase1TestGenderMap_(overrides) {
  const map = new Map();
  for (let i = 1; i <= 20; i++) map.set('p' + i, 'chico');
  Object.keys(overrides || {}).forEach(player => {
    map.set(normalizePlayerKey_(player), String(overrides[player]).toLowerCase());
  });
  return map;
}

function phase1TestAssert_(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed.');
}
