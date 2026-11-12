/**
 * Final-stage qualification and fixed-pair generation.
 *
 * ORO_PLATA columns:
 * Competición | Pos. | Jugador | Pareja | ID Pareja
 */

/**
 * Finds a complete pairing where each pair's ranking distance is within
 * maxRankGap. The search is randomized but uses backtracking so it never
 * silently leaves an avoidable unpaired player.
 *
 * players: [{ position: number, player: string }]
 */
function generateConstrainedPairs(players, maxRankGap) {
  const list = players.slice().sort((a, b) => a.position - b.position);
  if (list.length % 2 !== 0) {
    throw new Error('El número de jugadores debe ser par para generar parejas completas.');
  }

  function solve(remaining) {
    if (!remaining.length) return [];
    const first = remaining[0];
    const candidates = shuffle(remaining.slice(1).filter(candidate =>
      Math.abs(candidate.position - first.position) <= maxRankGap
    ));

    for (const candidate of candidates) {
      const rest = remaining.filter(item =>
        item.player !== first.player && item.player !== candidate.player
      );
      const tail = solve(rest);
      if (tail) return [[first, candidate], ...tail];
    }
    return null;
  }

  const result = solve(list);
  if (!result) {
    throw new Error(
      'No se pueden formar todas las parejas respetando la diferencia máxima de ' +
      maxRankGap + ' posiciones en el grupo: ' + list.map(item => item.player).join(', ') +
      '. Ajusta CONFIG!B6 o la distribución de ORO/PLATA.'
    );
  }
  return result;
}

/**
 * Odd groups leave their highest-ranked player without a partner, as agreed.
 * The remaining even-sized group is paired with the same rank-gap constraint.
 */
function generateConstrainedPairsAllowOdd(players, maxRankGap) {
  const list = players.slice().sort((a, b) => a.position - b.position);
  if (list.length % 2 === 0) {
    return generateConstrainedPairs(list, maxRankGap);
  }
  const pendingPlayer = list[0];
  const pairs = generateConstrainedPairs(list.slice(1), maxRankGap);
  return [[pendingPlayer, null], ...pairs];
}

/** Returns unique fixed pairs for a category, ordered by their ranking. */
function getFinalPairs(group) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.FINAL_PAIRS);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues()
    .filter(row => String(row[0]) === String(group) && row[2] && row[4])
    .sort((a, b) => Number(a[1]) - Number(b[1]));

  const seen = new Set();
  const pairs = [];
  rows.forEach(row => {
    const pairId = String(row[4]);
    if (seen.has(pairId)) return;
    seen.add(pairId);
    const player = String(row[2]).trim();
    const partner = String(row[3] || 'PENDIENTE').trim() || 'PENDIENTE';
    pairs.push([player, partner]);
  });
  return pairs;
}

/** Splits the current classification into ORO and PLATA and fixes the pairs. */
function generateGoldSilver() {
  const ss = SpreadsheetApp.getActive();
  const standingsSheet = ss.getSheetByName(SHEETS.STANDINGS);
  const finalSheet = ss.getSheetByName(SHEETS.FINAL_PAIRS);
  if (!standingsSheet || standingsSheet.getLastRow() < 2) {
    throw new Error('Primero debes generar o actualizar la clasificación.');
  }
  if (!finalSheet) throw new Error('No existe la hoja ORO_PLATA.');

  const config = getConfig();
  const standings = standingsSheet.getRange(2, 1, standingsSheet.getLastRow() - 1, 10)
    .getValues()
    .filter(row => row[1])
    .map(row => ({
      position: Number(row[0]),
      player: String(row[1]).trim()
    }))
    .filter(item => item.player && Number.isFinite(item.position))
    .sort((a, b) => a.position - b.position);

  if (!standings.length) throw new Error('La clasificación no contiene jugadores.');
  if (config.goldPlayers < 1 || config.goldPlayers > standings.length) {
    throw new Error(
      'El número de jugadores en ORO (CONFIG!B8) debe estar entre 1 y ' +
      standings.length + '.'
    );
  }
  if (new Set(standings.map(item => item.player)).size !== standings.length) {
    throw new Error('Hay nombres duplicados en CLASIFICACION. Corrígelos antes de generar ORO/PLATA.');
  }

  const goldPlayers = standings.slice(0, config.goldPlayers);
  const silverPlayers = standings.slice(config.goldPlayers);
  const goldPairs = generateConstrainedPairsAllowOdd(goldPlayers, config.maxRankGap);
  const silverPairs = generateConstrainedPairsAllowOdd(silverPlayers, config.maxRankGap);

  const output = [];
  function appendGroup(groupName, pairs) {
    pairs.forEach((pair, index) => {
      const first = pair[0];
      const second = pair[1];
      const pairId = groupName + '-' + (index + 1);
      output.push([
        groupName, first.position, first.player,
        second ? second.player : 'PENDIENTE', pairId
      ]);
      if (second) {
        output.push([
          groupName, second.position, second.player, first.player, pairId
        ]);
      }
    });
  }

  appendGroup('ORO', goldPairs);
  appendGroup('PLATA', silverPairs);

  // Replace only the generated qualification pairs after both groups validate.
  if (finalSheet.getLastRow() > 1) {
    finalSheet.getRange(2, 1, finalSheet.getLastRow() - 1, 5).clearContent();
  }
  if (output.length) {
    finalSheet.getRange(2, 1, output.length, 5).setValues(output);
  }
  finalSheet.autoResizeColumns(1, 5);

  // The knockout generator reads the fixed pairs just written above.
  generateKnockout();
  SpreadsheetApp.getActive().toast(
    'ORO y PLATA generados: ' + goldPlayers.length + ' jugadores en ORO y ' +
    silverPlayers.length + ' en PLATA.'
  );
}
