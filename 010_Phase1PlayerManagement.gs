/**
 * Adds one player to an already generated Phase 1 schedule with the minimum
 * possible number of changed matches. Blocked after any Phase 1 score is entered.
 */
function adminAddPhase1Player(playerData) {
  requireAdmin();
  const payload = playerData && typeof playerData === 'object' ? playerData : { name: playerData };
  const name = String(payload.name || '').trim();
  const newGender = normalizePlayerGender_(payload.gender);
  if (!name) throw new Error('Escribe el nombre del jugador.');
  if (!newGender) throw new Error('Selecciona el género del jugador: Chico o Chica.');

  const ss = SpreadsheetApp.getActive();
  const playersSheet = ss.getSheetByName(SHEETS.PLAYERS);
  const phaseSheet = ss.getSheetByName(SHEETS.PHASE1);
  if (!playersSheet || !phaseSheet) throw new Error('No se encuentran las hojas JUGADORES o FASE1.');
  if (phaseSheet.getLastRow() < 2) throw new Error('Primero debes generar la Fase 1.');

  const playerLastRow = playersSheet.getLastRow();
  const playerWidth = Math.max(2, playersSheet.getLastColumn());
  const playerRows = playerLastRow >= 2
    ? playersSheet.getRange(2, 1, playerLastRow - 1, playerWidth).getValues()
    : [];
  const existingPlayerRow = playerRows.findIndex(row =>
    String(row[0] || '').trim().toLowerCase() === name.toLowerCase()
  );

  const phaseLastRow = phaseSheet.getLastRow();
  const phaseRows = phaseSheet.getRange(2, 1, phaseLastRow - 1, 10).getValues();

  const hasStarted = phaseRows.some(row =>
    (row[8] !== '' && row[8] !== null) || (row[9] !== '' && row[9] !== null)
  );
  if (hasStarted) {
    throw new Error('La Fase 1 ya ha empezado. No se puede redistribuir sus partidos.');
  }

  const phasePlayerNames = new Set();
  phaseRows.forEach(row => [row[3], row[4], row[6], row[7]].forEach(value => {
    const player = String(value || '').trim();
    if (player && player.toUpperCase() !== 'PENDIENTE') phasePlayerNames.add(player.toLowerCase());
  }));
  if (phasePlayerNames.has(name.toLowerCase())) {
    throw new Error('Este jugador ya aparece en los partidos de Fase 1.');
  }

  const activePlayers = getPlayers();
  if (activePlayers.some(player => player.toLowerCase() === name.toLowerCase())) {
    throw new Error('Este jugador ya está activo en la lista de participantes.');
  }

  const config = getConfig();
  const matchesPerPlayer = config.matchesPerPlayer;
  // Regla 1: el jugador incorporado también debe respetar los cruces por género.
  const genderMap = getPhase1GenderMap_(activePlayers);
  genderMap.set(normalizePlayerKey_(name), newGender);
  if (matchesPerPlayer % 4 !== 0) {
    throw new Error('La incorporación automática requiere que los partidos por jugador sean múltiplo de 4.');
  }
  if ((activePlayers.length * matchesPerPlayer) % 4 !== 0 ||
      ((activePlayers.length + 1) * matchesPerPlayer) % 4 !== 0) {
    throw new Error('Con esta cantidad de jugadores y partidos no es posible mantener el mismo número de partidos para todos.');
  }

  // Count appearances using normalized names to avoid false mismatches
  // caused by capitalization or leading/trailing spaces in the sheet.
  const counts = {};
  const displayNames = {};
  activePlayers.forEach(player => {
    const key = String(player).trim().toLowerCase();
    counts[key] = 0;
    displayNames[key] = player;
  });
  const usedPairs = new Set();
  phaseRows.forEach((row, rowIndex) => {
    const teams = [
      [String(row[3] || '').trim(), String(row[4] || '').trim()],
      [String(row[6] || '').trim(), String(row[7] || '').trim()]
    ];
    teams.forEach(team => {
      if (!team[0] || !team[1]) {
        throw new Error('Hay un partido incompleto en FASE1 (fila ' + (rowIndex + 2) + '). Corrígelo antes de incorporar al jugador.');
      }
      const key1 = team[0].toLowerCase();
      const key2 = team[1].toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(counts, key1) ||
          !Object.prototype.hasOwnProperty.call(counts, key2)) {
        throw new Error('Hay jugadores en FASE1 que no están activos en JUGADORES (fila ' + (rowIndex + 2) + '): ' +
          team.filter(player => !Object.prototype.hasOwnProperty.call(counts, player.toLowerCase())).join(', ') +
          '. Revisa la lista antes de continuar.');
      }
      counts[key1]++;
      counts[key2]++;
      const key = pairKey(key1, key2);
      if (usedPairs.has(key)) {
        throw new Error('La Fase 1 actual ya contiene compañeros repetidos. No se puede redistribuir de forma segura.');
      }
      usedPairs.add(key);
    });
  });

  const invalidCounts = activePlayers
    .filter(player => counts[String(player).trim().toLowerCase()] !== matchesPerPlayer)
    .map(player => {
      const count = counts[String(player).trim().toLowerCase()];
      return player + ': ' + count + ' partidos';
    });
  if (invalidCounts.length) {
    throw new Error(
      'Reparto desigual en Fase 1. Configuración: ' + matchesPerPlayer +
      ' partidos por jugador. Descuadres: ' + invalidCounts.join('; ') +
      '. No se ha modificado ningún partido.'
    );
  }

  const plan = findPhase1InsertionPlan_(phaseRows, matchesPerPlayer, usedPairs, genderMap, name);
  if (!plan) {
    throw new Error('No he encontrado una redistribución válida sin repetir compañeros. No se ha modificado ningún dato.');
  }

  const updatedRows = phaseRows.map(row => row.slice());
  plan.replacements.forEach(item => {
    updatedRows[item.rowIndex][item.columnIndex] = name;
  });

  const existingIds = new Set(phaseRows.map(row => String(row[0] || '').trim()));
  const allNumericIds = phaseRows.every(row => String(row[0] || '').trim() !== '' &&
    Number.isFinite(Number(row[0])));
  let nextNumericId = phaseRows.reduce((max, row) => Math.max(max, Number(row[0]) || 0), 0) + 1;
  let manualSequence = 1;
  const nextMatchId = () => {
    if (allNumericIds) {
      while (existingIds.has(String(nextNumericId))) nextNumericId++;
      const id = nextNumericId++;
      existingIds.add(String(id));
      return id;
    }
    let id;
    do {
      id = 'F1-AD-' + String(manualSequence++).padStart(3, '0');
    } while (existingIds.has(id));
    existingIds.add(id);
    return id;
  };

  const maxRound = phaseRows.reduce((max, row) =>
    Math.max(max, Number(row[2]) || 0), 0);
  const newRows = [];
  for (let i = 0; i < plan.newPairs.length; i += 2) {
    const team1 = plan.newPairs[i];
    const team2 = plan.newPairs[i + 1];
    newRows.push([nextMatchId(), '', maxRound + 1, team1[0], team1[1], 'VS', team2[0], team2[1], '', '']);
  }

  // Register/reactivate the player first. Roll back the schedule if any write fails.
  let addedPlayerRow = null;
  let reactivated = false;
  let previousActiveValue = null;
  if (existingPlayerRow >= 0) {
    addedPlayerRow = existingPlayerRow + 2;
    previousActiveValue = playerRows[existingPlayerRow][1];
    playersSheet.getRange(addedPlayerRow, 2).setValue(true);
    reactivated = true;
  } else {
    addedPlayerRow = playerLastRow + 1;
    const newPlayerRow = new Array(playerWidth).fill('');
    newPlayerRow[0] = name;
    newPlayerRow[1] = true;
    const genderColumn = playersSheet.getRange(1, 1, 1, playerWidth).getValues()[0]
      .findIndex(value => normalizeGenderHeader_(value) === 'genero');
    if (genderColumn >= 0) newPlayerRow[genderColumn] = newGender === 'chico' ? 'Chico' : 'Chica';
    if (playerWidth >= 3 && String(playersSheet.getRange(1, 3).getValue()).trim().toLowerCase() === 'partidos') {
      newPlayerRow[2] = 0;
    }
    playersSheet.getRange(addedPlayerRow, 1, 1, playerWidth).setValues([newPlayerRow]);
  }

  try {
    phaseSheet.getRange(2, 1, updatedRows.length, 10).setValues(updatedRows);
    const firstNewRow = phaseRows.length + 2;
    phaseSheet.getRange(firstNewRow, 1, newRows.length, 10).setValues(newRows);
    phaseSheet.getRange(firstNewRow, 2, newRows.length, 1).setBackground('#fff2cc');
    phaseSheet.getRange(firstNewRow, 9, newRows.length, 2).setBackground('#d9ead3');
    SpreadsheetApp.flush();
  } catch (error) {
    phaseSheet.getRange(2, 1, phaseRows.length, 10).setValues(phaseRows);
    const firstNewRow = phaseRows.length + 2;
    if (phaseSheet.getLastRow() >= firstNewRow) {
      phaseSheet.getRange(firstNewRow, 1, newRows.length, 10).clearContent();
    }
    if (reactivated) {
      playersSheet.getRange(addedPlayerRow, 2).setValue(previousActiveValue);
    } else {
      playersSheet.deleteRow(addedPlayerRow);
    }
    throw error;
  }

  const affectedMatches = plan.replacements.map(item => {
    const before = phaseRows[item.rowIndex];
    const after = updatedRows[item.rowIndex];
    return {
      type: 'modified',
      id: String(after[0]),
      round: after[2],
      beforeTeam1: [String(before[3]), String(before[4])],
      beforeTeam2: [String(before[6]), String(before[7])],
      afterTeam1: [String(after[3]), String(after[4])],
      afterTeam2: [String(after[6]), String(after[7])]
    };
  }).concat(newRows.map(row => ({
    type: 'added',
    id: String(row[0]),
    round: row[2],
    afterTeam1: [String(row[3]), String(row[4])],
    afterTeam2: [String(row[6]), String(row[7])]
  })));

  return {
    ok: true,
    newPlayer: name,
    modifiedMatches: plan.replacements.map(item => String(phaseRows[item.rowIndex][0])),
    addedMatches: newRows.map(row => String(row[0])),
    affectedMatches: affectedMatches,
    data: getPublicTournamentData()
  };
}

/**
 * Finds the smallest valid redistribution. For a target of four matches,
 * four old matches are edited and one new match is added. Each displaced
 * player loses one old appearance and gains one appearance in the new match.
 */
function findPhase1InsertionPlan_(phaseRows, matchesPerPlayer, usedPairs, genderMap, newPlayerName) {
  const candidatesByRow = phaseRows.map((row, rowIndex) => {
    const candidates = [];
    [[3, 4], [6, 7]].forEach(teamColumns => {
      teamColumns.forEach((columnIndex, slotIndex) => {
        const removedPlayer = String(row[columnIndex] || '').trim();
        const teammate = String(row[teamColumns[1 - slotIndex]] || '').trim();
        if (removedPlayer && teammate) {
          candidates.push({
            rowIndex: rowIndex,
            columnIndex: columnIndex,
            removedPlayer: removedPlayer,
            teammate: teammate,
            oldPair: pairKey(removedPlayer, teammate)
          });
        }
      });
    });
    return shuffle(candidates);
  });

  let visited = 0;
  const maxVisited = 250000;

  function search(rowIndex, selected, removedPlayers, newTeammates) {
    visited++;
    if (visited > maxVisited) return null;

    if (selected.length === matchesPerPlayer) {
      const remainingPairs = new Set(usedPairs);
      selected.forEach(item => remainingPairs.delete(item.oldPair));
      const displaced = selected.map(item => item.removedPlayer);
      const newPairs = findGenderValidNewPhase1Pairs_(displaced, remainingPairs, genderMap);
      if (!newPairs) return null;
      const proposedRows = phaseRows.map(row => row.slice());
      selected.forEach(item => { proposedRows[item.rowIndex][item.columnIndex] = newPlayerName; });
      const proposedMatches = proposedRows.map(row => [[String(row[3]), String(row[4])], [String(row[6]), String(row[7])]]);
      if (!validatePhase1GenderSchedule_(proposedMatches, genderMap).valid) return null;
      return { replacements: selected.slice(), newPairs: newPairs };
    }

    if (rowIndex >= candidatesByRow.length ||
        candidatesByRow.length - rowIndex < matchesPerPlayer - selected.length) return null;

    for (const candidate of candidatesByRow[rowIndex]) {
      const removedKey = candidate.removedPlayer.toLowerCase();
      const teammateKey = candidate.teammate.toLowerCase();
      if (removedPlayers.has(removedKey) || newTeammates.has(teammateKey)) continue;

      selected.push(candidate);
      removedPlayers.add(removedKey);
      newTeammates.add(teammateKey);
      const result = search(rowIndex + 1, selected, removedPlayers, newTeammates);
      if (result) return result;
      selected.pop();
      removedPlayers.delete(removedKey);
      newTeammates.delete(teammateKey);
    }

    return search(rowIndex + 1, selected, removedPlayers, newTeammates);
  }

  return search(0, [], new Set(), new Set());
}

/**
 * REGLA 1 - FASE 1 (alta de jugador):
 * Forma nuevos partidos con los jugadores desplazados, evitando repetir
 * compañeros y comprobando que cada cruce respeta la regla de género.
 */
function findGenderValidNewPhase1Pairs_(players, usedPairs, genderMap) {
  if (players.length === 0) return [];
  if (players.length % 4 !== 0) return null;
  const first = players[0];
  for (const teammate1 of shuffle(players.slice(1))) {
    const firstKey = pairKey(first, teammate1);
    if (usedPairs.has(firstKey)) continue;
    const rest = players.filter(player => player !== first && player !== teammate1);
    const secondPlayer = rest[0];
    for (const teammate2 of shuffle(rest.slice(1))) {
      const secondKey = pairKey(secondPlayer, teammate2);
      if (usedPairs.has(secondKey)) continue;
      const team1 = [first, teammate1];
      const team2 = [secondPlayer, teammate2];
      if (!isPhase1GenderMatchValid_(team1, team2, genderMap)) continue;
      const remaining = rest.filter(player => player !== secondPlayer && player !== teammate2);
      const nextUsed = new Set(usedPairs);
      nextUsed.add(firstKey);
      nextUsed.add(secondKey);
      const result = findGenderValidNewPhase1Pairs_(remaining, nextUsed, genderMap);
      if (result) return [team1, team2, ...result];
    }
  }
  return null;
}

function findUniquePhase1Pairs_(players, usedPairs) {
  if (!players.length) return [];
  if (players.length % 2 !== 0) return null;

  const first = players[0];
  const rest = shuffle(players.slice(1));
  for (const teammate of rest) {
    const key = pairKey(first, teammate);
    if (usedPairs.has(key)) continue;
    const remaining = players.filter(player => player !== first && player !== teammate);
    const result = findUniquePhase1Pairs_(remaining, usedPairs);
    if (result) return [[first, teammate], ...result];
  }
  return null;
}
