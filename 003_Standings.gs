function updateStandings() {
  const ss = SpreadsheetApp.getActive();
  const players = getPlayers();
  const phaseSheet = ss.getSheetByName(SHEETS.PHASE1);
  const standingsSheet = ss.getSheetByName(SHEETS.STANDINGS);

  if (!phaseSheet || !standingsSheet) {
    throw new Error('No se han encontrado las hojas FASE1 o CLASIFICACION. Ejecuta setupTournament().');
  }

  // Preserve the manual tiebreak entered by player name, not by row.
  // This is essential because the classification rows are reordered after each update.
  const manualByPlayer = {};
  const previousLastRow = standingsSheet.getLastRow();
  if (previousLastRow >= 2) {
    const previousRows = standingsSheet
      .getRange(2, 2, previousLastRow - 1, 9) // B:J
      .getValues();

    previousRows.forEach(row => {
      const playerName = String(row[0] || '').trim();
      if (playerName) {
        manualByPlayer[playerName] = row[8]; // Column J: manual tiebreak
      }
    });
  }

  const stats = {};
  players.forEach(player => {
    stats[player] = { played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
  });

  const lastPhaseRow = phaseSheet.getLastRow();
  if (lastPhaseRow >= 2) {
    const rows = phaseSheet.getRange(2, 1, lastPhaseRow - 1, 10).getValues();

    rows.forEach(row => {
      const team1Player1 = row[3];
      const team1Player2 = row[4];
      const team2Player1 = row[6];
      const team2Player2 = row[7];
      const team1Score = readScore(row[8]);
      const team2Score = readScore(row[9]);

      if (team1Score === null || team2Score === null) return;
      if (!stats[team1Player1] || !stats[team1Player2] ||
          !stats[team2Player1] || !stats[team2Player2]) return;

      [team1Player1, team1Player2].forEach(player => {
        stats[player].played++;
        stats[player].pointsFor += team1Score;
        stats[player].pointsAgainst += team2Score;
      });

      [team2Player1, team2Player2].forEach(player => {
        stats[player].played++;
        stats[player].pointsFor += team2Score;
        stats[player].pointsAgainst += team1Score;
      });

      if (team1Score > team2Score) {
        [team1Player1, team1Player2].forEach(player => stats[player].wins++);
        [team2Player1, team2Player2].forEach(player => stats[player].losses++);
      } else if (team2Score > team1Score) {
        [team2Player1, team2Player2].forEach(player => stats[player].wins++);
        [team1Player1, team1Player2].forEach(player => stats[player].losses++);
      }
    });
  }

  const ranking = players.map(player => {
    const playerStats = stats[player];
    const pointDifference = playerStats.pointsFor - playerStats.pointsAgainst;
    const winPercentage = playerStats.played > 0
      ? playerStats.wins / playerStats.played
      : 0;

    return [
      0,
      player,
      playerStats.played,
      playerStats.wins,
      playerStats.losses,
      playerStats.pointsFor,
      playerStats.pointsAgainst,
      pointDifference,
      winPercentage,
      manualByPlayer[player] ?? ''
    ];
  });

  // Main ranking:
  // 1. Wins DESC
  // 2. Point difference DESC
  // 3. Points for DESC
  // 4. Manual tiebreak ASC, only when the previous three values are equal.
  ranking.sort((playerA, playerB) => {
    if (playerB[3] !== playerA[3]) return playerB[3] - playerA[3];
    if (playerB[7] !== playerA[7]) return playerB[7] - playerA[7];
    if (playerB[5] !== playerA[5]) return playerB[5] - playerA[5];

    const manualA = parseManualPosition(playerA[9]);
    const manualB = parseManualPosition(playerB[9]);

    // If both positions are filled, they determine the order.
    if (manualA !== null && manualB !== null) {
      if (manualA !== manualB) return manualA - manualB;
    }

    // If only one position has been entered, the entered player goes first.
    if (manualA !== null && manualB === null) return -1;
    if (manualA === null && manualB !== null) return 1;

    return 0;
  });

  ranking.forEach((row, index) => {
    row[0] = index + 1;
  });

  // Clear the previous classification.
  if (standingsSheet.getLastRow() > 1) {
    standingsSheet
      .getRange(2, 1, standingsSheet.getLastRow() - 1, 11)
      .clearContent()
      .setBackground(null)
      .clearNote();
  }

  // Keep the 10 existing columns and use K for the visible tiebreak warning.
  if (ranking.length) {
    standingsSheet.getRange(2, 1, ranking.length, 10).setValues(ranking);
  }

  standingsSheet.getRange('A1:K1')
    .setFontWeight('bold')
    .setBackground('#d9ead3');
  standingsSheet.getRange('K1').setValue('Aviso');

  if (ranking.length) {
    standingsSheet.getRange(2, 9, ranking.length, 1).setNumberFormat('0.0%');
  }

  // Find groups tied on the actual sporting criteria.
  // A tie remains a warning until every player in that group has a unique
  // numeric manual position.
  for (let index = 0; index < ranking.length; index++) {
    const current = ranking[index];
    const tiedPlayers = [current];

    while (index + tiedPlayers.length < ranking.length) {
      const candidate = ranking[index + tiedPlayers.length];
      if (!sameSportingRanking(current, candidate)) break;
      tiedPlayers.push(candidate);
    }

    if (tiedPlayers.length > 1) {
      const manualPositions = tiedPlayers.map(row => parseManualPosition(row[9]));
      const complete = manualPositions.every(position => position !== null);
      const unique = new Set(manualPositions).size === manualPositions.length;
      const resolved = complete && unique;

      const warningText = resolved
        ? '✓ DESEMPATE RESUELTO'
        : '⚠️ DESEMPATE PENDIENTE';

      const startRow = index + 2;
      standingsSheet
        .getRange(startRow, 1, tiedPlayers.length, 10)
        .setBackground('#fff2cc');
      standingsSheet
        .getRange(startRow, 11, tiedPlayers.length, 1)
        .setValue(warningText)
        .setBackground('#fff2cc')
        .setFontWeight('bold');

      if (!resolved) {
        standingsSheet
          .getRange(startRow, 10, tiedPlayers.length, 1)
          .setNote('Introduce una posición manual única para cada jugador empatado en este grupo. Después ejecuta "Actualizar clasificación".');
      }

      index += tiedPlayers.length - 1;
    }
  }

  standingsSheet.autoResizeColumns(1, 11);
  standingsSheet.setFrozenRows(1);

  SpreadsheetApp.getActive().toast('Clasificación actualizada. Los desempates manuales se conservan por jugador y se aplican al actualizar.');
}

function parseManualPosition(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null;

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;

  return number;
}

function sameSportingRanking(playerA, playerB) {
  return playerA[3] === playerB[3] &&
         playerA[7] === playerB[7] &&
         playerA[5] === playerB[5];
}