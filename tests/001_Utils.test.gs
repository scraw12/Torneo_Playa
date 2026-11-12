/** Unit tests for 001_Utils.gs. In-memory only. */
function test001Utils() {
  phase1TestAssert_(pairKey('Marta', 'Alejandro') === pairKey('Alejandro', 'Marta'),
    'pairKey debe ser independiente del orden.');
  phase1TestAssert_(readScore('21') === 21, 'readScore debe convertir un marcador numérico.');
  phase1TestAssert_(readScore('') === null, 'readScore debe tratar vacío como null.');
  phase1TestAssert_(readScore(null) === null, 'readScore debe tratar null como null.');
  phase1TestAssert_(readScore('abc') === null, 'readScore debe rechazar texto no numérico.');
  phase1TestAssert_(formatPublicDate('fecha-invalida') === 'fecha-invalida',
    'formatPublicDate debe conservar texto si la fecha no se puede parsear.');
}
