/** Unit tests for pure standings helpers in 003_Standings.gs. */
function test003Standings() {
  phase1TestAssert_(parseManualPosition('') === null, 'Vacío debe ser null.');
  phase1TestAssert_(parseManualPosition(null) === null, 'Null debe ser null.');
  phase1TestAssert_(parseManualPosition('3') === 3, 'Debe aceptar posición positiva.');
  phase1TestAssert_(parseManualPosition('0') === null, 'No debe aceptar cero.');
  phase1TestAssert_(parseManualPosition('-1') === null, 'No debe aceptar negativos.');
  phase1TestAssert_(parseManualPosition('abc') === null, 'No debe aceptar texto.');
  const a = [1, 'A', 4, 3, 1, 50, 30, 20];
  const b = [2, 'B', 4, 3, 1, 50, 30, 20];
  const c = [3, 'C', 4, 3, 1, 49, 30, 19];
  phase1TestAssert_(sameSportingRanking(a, b), 'Debe detectar empate deportivo.');
  phase1TestAssert_(!sameSportingRanking(a, c), 'No debe detectar empate con diferencia distinta.');
}
