/** Unit tests for pure public classification transformation in 004_FinalStage.gs. */
function test004FinalStage() {
  const rows = [
    [1, 'A', 4, 3, 1, 50, 30, 20, 0.75, ''],
    [2, 'B', 4, 3, 1, 50, 30, 20, 0.75, ''],
    [3, 'C', 4, 2, 2, 45, 30, 15, 0.50, '']
  ];
  const result = buildPublicClassification_(rows);
  phase1TestAssert_(result.length === 3, 'Debe conservar todas las filas.');
  phase1TestAssert_(result[0].tieStatus === '⚠️ DESEMPATE PENDIENTE',
    'Debe marcar empate sin posiciones manuales completas.');
  phase1TestAssert_(result[1].tieGroup === result[0].tieGroup,
    'Los jugadores empatados deben compartir tieGroup.');
  phase1TestAssert_(result[2].tieStatus === '', 'No debe marcar jugadores sin empate.');
}
