/**
 * Adds one player to an already generated Phase 1 schedule with the minimum
 * possible number of changed matches. Blocked after any Phase 1 score is entered.
 */
function adminAddPhase1Player(playerName) {
  requireAdmin();
  const name = String(playerName || '').trim();
  if (!name) throw new Error('Escribe el nombre del jugador.');

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
  if (matchesPerPlayer % 4 !== 0) {
    throw new Error('La incorporación automática requiere que los partidos por jugador sean múltiplo de 4.');
  }
  if ((activePlayers.length * matchesPerPlayer) % 4 !== 0 ||
      ((activePlayers.length + 1) * matchesPerPlayer) % 4 !== 0) {
    throw new Error('Con esta cantidad de jugadores y partidos no es posible mantener el mismo número de partidos para todos.');
  }

  const counts = {};
  activePlayers.forEach(player => counts[player] = 0);
  const usedPairs = new Set();
  phaseRows.forEach(row => {
    const teams = [
      [String(row[3] || '').trim(), String(row[4] || '').trim()],
      [String(row[6] || '').trim(), String(row[7] || '').trim()]
    ];
    teams.forEach(team => {
      if (!team[0] || !team[1]) {
        throw new Error('Hay un partido incompleto en FASE1. Corrígelo antes de incorporar al jugador.');
      }
      if (!Object.prototype.hasOwnProperty.call(counts, team[0]) ||
          !Object.prototype.hasOwnProperty.call(counts, team[1])) {
        throw new Error('Hay jugadores en FASE1 que no están activos en JUGADORES. Revisa la lista antes de continuar.');
      }
      counts[team[0]]++;
      counts[team[1]]++;
      const key = pairKey(team[0], team[1]);
      if (usedPairs.has(key)) {
        throw new Error('La Fase 1 actual ya contiene compañeros repetidos. No se puede redistribuir de forma segura.');
      }
      usedPairs.add(key);
    });
  });

  const invalidCounts = activePlayers.filter(player => counts[player] !== matchesPerPlayer);
  if (invalidCounts.length) {
    throw new Error('La Fase 1 actual no tiene el mismo número de partidos para todos. No se puede incorporar al jugador automáticamente.');
  }

  const plan = findPhase1InsertionPlan_(phaseRows, matchesPerPlayer, usedPairs);
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
    if (reactivated) {
      playersSheet.getRange(addedPlayerRow, 2).setValue(previousActiveValue);
    } else {
      playersSheet.deleteRow(addedPlayerRow);
    }
    throw error;
  }

  return {
    ok: true,
    newPlayer: name,
    modifiedMatches: plan.replacements.map(item => String(phaseRows[item.rowIndex][0])),
    addedMatches: newRows.map(row => String(row[0])),
    data: getPublicTournamentData()
  };
}

/**
 * Finds the smallest valid redistribution. For a target of four matches,
 * four old matches are edited and one new match is added. Each displaced
 * player loses one old appearance and gains one appearance in the new match.
 */
function findPhase1InsertionPlan_(phaseRows, matchesPerPlayer, usedPairs) {
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
      const newPairs = findUniquePhase1Pairs_(displaced, remainingPairs);
      return newPairs ? { replacements: selected.slice(), newPairs: newPairs } : null;
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
