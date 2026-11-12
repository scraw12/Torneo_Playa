/**
 * TESTS.gs — Pruebas manuales para Torneo Vóley Playa.
 *
 * Instala como archivo nuevo TESTS.gs en Apps Script.
 * Ejecuta runReadOnlyTests() primero: solo lee datos.
 *
 * Las funciones con "Destructive" modifican hojas. Úsalas solo en una copia
 * de pruebas o cuando quieras regenerar esos datos.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🧪 Tests torneo')
    .addItem('Ejecutar tests seguros', 'runReadOnlyTests')
    .addSeparator()
    .addItem('Generar Fase 1 (MODIFICA DATOS)', 'testGeneratePhase1Destructive')
    .addItem('Actualizar clasificación', 'testUpdateStandingsDestructive')
    .addItem('Generar Oro / Plata (MODIFICA DATOS)', 'testGenerateGoldSilverDestructive')
    .addItem('Generar eliminatorias (MODIFICA DATOS)', 'testGenerateKnockoutDestructive')
    .addToUi();
}

function runReadOnlyTests() {
  var results = [];
  var startedAt = new Date();

  testRecord_(results, 'Hojas necesarias', function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var required = [
      'CONFIG', 'JUGADORES', 'FASE1', 'CLASIFICACION',
      'ORO_PLATA', 'ELIMINATORIAS', 'HIST_JUGADORES', 'HIST_TORNEOS'
    ];
    var missing = required.filter(function (name) {
      return !ss.getSheetByName(name);
    });
    if (missing.length) throw new Error('Faltan hojas: ' + missing.join(', '));
    return 'Encontradas ' + required.length + ' hojas.';
  });

  testRecord_(results, 'Métodos principales disponibles', function () {
    var expected = [
      'getPublicTournamentData', 'updateStandings',
      'adminGeneratePhase1', 'adminUpdateStandings',
      'adminGenerateGoldSilver', 'adminGenerateKnockout',
      'adminFinishTournament', 'adminNewTournament',
      'savePublicResult', 'savePendingPlayer'
    ];
    var missing = expected.filter(function (name) {
      return typeof this[name] !== 'function';
    }, this);
    if (missing.length) {
      throw new Error('No se encuentran (puede variar el nombre en tu versión): ' + missing.join(', '));
    }
    return 'Encontrados ' + expected.length + ' métodos.';
  });

  testRecord_(results, 'Configuración CONFIG!B2:B8', function () {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
    var v = sh.getRange('B2:B8').getValues().map(function (r) { return r[0]; });
    var errors = [];
    if (!String(v[0] || '').trim()) errors.push('B2: nombre del torneo vacío');
    if (!(Number(v[2]) > 0)) errors.push('B4: partidos por jugador debe ser positivo');
    if (!(Number(v[3]) > 0)) errors.push('B5: número de pistas debe ser positivo');
    if (!Number.isFinite(Number(v[4])) || Number(v[4]) < 0) errors.push('B6: diferencia máxima inválida');
    if (!(Number(v[5]) > 0)) errors.push('B7: mínimo de partidos debe ser positivo');
    if (!Number.isFinite(Number(v[6])) || Number(v[6]) < 0) errors.push('B8: jugadores en Oro debe ser cero o positivo');
    if (errors.length) throw new Error(errors.join('; '));
    return 'Valores básicos válidos.';
  });

  testRecord_(results, 'Lectura de datos de la Web App', function () {
    var data = getPublicTournamentData();
    if (!data || typeof data !== 'object' || !Object.keys(data).length) {
      throw new Error('getPublicTournamentData() no devolvió un objeto con propiedades.');
    }
    return 'Respuesta válida: ' + Object.keys(data).join(', ');
  });

  testRecord_(results, 'Columnas y encabezado VS', function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requirements = [
      ['FASE1', 10], ['CLASIFICACION', 9],
      ['ORO_PLATA', 5], ['ELIMINATORIAS', 8]
    ];
    requirements.forEach(function (item) {
      var sh = ss.getSheetByName(item[0]);
      if (sh.getMaxColumns() < item[1]) {
        throw new Error(item[0] + ' necesita al menos ' + item[1] + ' columnas.');
      }
      if (sh.getLastRow() < 1) throw new Error(item[0] + ' no tiene encabezados.');
    });
    var headers = ss.getSheetByName('FASE1').getRange(1, 1, 1, 10).getDisplayValues()[0];
    if (String(headers[5]).trim().toUpperCase() !== 'VS') {
      throw new Error('La columna F de FASE1 debe tener el encabezado VS.');
    }
    return 'Estructura mínima correcta.';
  });

  showTestReport_(results, startedAt);
}

function testRecord_(results, name, callback) {
  var start = new Date().getTime();
  try {
    results.push({
      name: name, status: 'OK',
      detail: callback() || 'Prueba completada.',
      durationMs: new Date().getTime() - start
    });
  } catch (error) {
    results.push({
      name: name, status: 'ERROR',
      detail: error && error.message ? error.message : String(error),
      durationMs: new Date().getTime() - start
    });
  }
}

function showTestReport_(results, startedAt) {
  var passed = results.filter(function (r) { return r.status === 'OK'; }).length;
  var failed = results.length - passed;
  var lines = [
    'RESULTADO DE TESTS',
    'Correctos: ' + passed,
    'Fallidos: ' + failed,
    'Duración: ' + (new Date().getTime() - startedAt.getTime()) + ' ms',
    ''
  ];
  results.forEach(function (r) {
    lines.push((r.status === 'OK' ? 'OK' : 'ERROR') + ' | ' + r.name +
      ' (' + r.durationMs + ' ms): ' + r.detail);
  });
  var report = lines.join('\n');
  Logger.log(report);
  try {
    SpreadsheetApp.getUi().alert('Tests del torneo', report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (ignored) {
    // Si no hay interfaz disponible, el resultado queda en el registro de ejecución.
  }
  return results;
}

function testGeneratePhase1Destructive() {
  confirmDestructiveTest_('Ejecutará adminGeneratePhase1() y puede reemplazar los partidos de FASE1.');
  adminGeneratePhase1();
  SpreadsheetApp.getUi().alert('Terminado. Revisa la hoja FASE1.');
}

function testUpdateStandingsDestructive() {
  confirmDestructiveTest_('Ejecutará adminUpdateStandings() y actualizará CLASIFICACION.');
  adminUpdateStandings();
  SpreadsheetApp.getUi().alert('Terminado. Revisa la hoja CLASIFICACION.');
}

function testGenerateGoldSilverDestructive() {
  confirmDestructiveTest_('Ejecutará adminGenerateGoldSilver() y puede reemplazar las parejas de ORO_PLATA.');
  adminGenerateGoldSilver();
  SpreadsheetApp.getUi().alert('Terminado. Revisa la hoja ORO_PLATA.');
}

function testGenerateKnockoutDestructive() {
  confirmDestructiveTest_('Ejecutará adminGenerateKnockout() y puede reemplazar ELIMINATORIAS.');
  adminGenerateKnockout();
  SpreadsheetApp.getUi().alert('Terminado. Revisa la hoja ELIMINATORIAS.');
}

function confirmDestructiveTest_(message) {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Prueba que modifica datos', message + '\n\n¿Continuar?', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) throw new Error('Prueba cancelada por el usuario.');
}
