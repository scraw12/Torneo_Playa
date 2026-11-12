/**
 * BL-aware generator for Phase 1 with exactly four BL players and
 * four matches per player.
 *
 * It first builds a BL-safe skeleton: each BL player partners each of the
 * other three BL players once, and partners one non-BL player once. The
 * ten BL-involving matches use distinct non-BL players for the partner and
 * opponent slots, so every non-BL player is exposed to BL at most once in
 * each independent counter. The remaining appearances are then scheduled
 * among non-BL players only.
 */
function generatePhase1FourBLPlayers_(players, genderMap, genderRules, blMap) {
  const blPlayers = players.filter(player =>
    blMap.get(normalizePlayerKey_(player)) === true
  );
  const regularPlayers = players.filter(player =>
    blMap.get(normalizePlayerKey_(player)) !== true
  );
  if (blPlayers.length !== 4 || players.length < 8) return null;

  const totalMatches = players.length;
  const blPairs = [];
  for (let i = 0; i < blPlayers.length; i++) {
    for (let j = i + 1; j < blPlayers.length; j++) {
      blPairs.push([blPlayers[i], blPlayers[j]]);
    }
  }

  const startedAt = Date.now();
  const maxRuntimeMs = 25000;
  const maxSkeletonAttempts = 500;

  for (let attempt = 0; attempt < maxSkeletonAttempts; attempt++) {
    if (Date.now() - startedAt > maxRuntimeMs) break;

    const shuffledPairs = shuffle(blPairs);
    const shuffledBL = shuffle(blPlayers);
    const templates = shuffledPairs.map(pair => ({
      type: 'BL_PAIR',
      blTeam: pair
    })).concat(shuffledBL.map(player => ({
      type: 'BL_MIXED',
      blTeam: [player]
    })));

    const assignedRegulars = shuffle(regularPlayers).slice(0, 24);
    if (assignedRegulars.length !== 24) return null;
    const candidate = [];
    let cursor = 0;
    let skeletonValid = true;

    for (const template of templates) {
      let team1;
      let team2;
      if (template.type === 'BL_PAIR') {
        team1 = template.blTeam.slice();
        team2 = assignedRegulars.slice(cursor, cursor + 2);
        cursor += 2;
      } else {
        team1 = [template.blTeam[0], assignedRegulars[cursor++]];
        team2 = assignedRegulars.slice(cursor, cursor + 2);
        cursor += 2;
      }

      if (team2.length !== 2 ||
          !isPhase1GenderMatchValid_(team1, team2, genderMap, genderRules)) {
        skeletonValid = false;
        break;
      }
      candidate.push([team1, team2]);
    }
    if (!skeletonValid || cursor !== 24) continue;

    const usedPairs = new Set();
    candidate.forEach(match => {
      usedPairs.add(pairKey(match[0][0], match[0][1]));
      usedPairs.add(pairKey(match[1][0], match[1][1]));
    });

    const remaining = {};
    players.forEach(player => {
      remaining[player] = blMap.get(normalizePlayerKey_(player)) === true ? 0 : 4;
    });
    assignedRegulars.forEach(player => { remaining[player]--; });

    const residualMatches = [];
    let visitedNodes = 0;
    const maxNodes = 12000;

    function searchResidual() {
      if (Date.now() - startedAt > maxRuntimeMs || visitedNodes++ >= maxNodes) return false;

      const eligible = players.filter(player =>
        remaining[player] > 0 && blMap.get(normalizePlayerKey_(player)) !== true
      );
      const remainingSeats = Object.values(remaining).reduce((sum, value) => sum + value, 0);
      if (remainingSeats === 0) {
        const fullSchedule = candidate.concat(residualMatches);
        return fullSchedule.length === totalMatches &&
          validatePhase1GenderSchedule_(fullSchedule, genderMap, genderRules).valid &&
          validatePhase1BLSchedule_(fullSchedule, blMap).valid;
      }
      if (remainingSeats % 4 !== 0 || eligible.length < 4) return false;

      // Prioritise players with the most appearances still to schedule.
      const maxRemaining = Math.max.apply(null, eligible.map(player => remaining[player]));
      const priority = shuffle(eligible.filter(player => remaining[player] === maxRemaining))
        .concat(shuffle(eligible.filter(player => remaining[player] < maxRemaining)));
      const pool = priority.slice(0, Math.min(10, priority.length));
      const combinations = [];

      for (let a = 0; a < pool.length - 3; a++) {
        for (let b = a + 1; b < pool.length - 2; b++) {
          for (let c = b + 1; c < pool.length - 1; c++) {
            for (let d = c + 1; d < pool.length; d++) {
              combinations.push([pool[a], pool[b], pool[c], pool[d]]);
            }
          }
        }
      }

      for (const selected of shuffle(combinations).slice(0, 90)) {
        const forms = shuffle([
          [[selected[0], selected[1]], [selected[2], selected[3]]],
          [[selected[0], selected[2]], [selected[1], selected[3]]],
          [[selected[0], selected[3]], [selected[1], selected[2]]]
        ]);
        for (const form of forms) {
          const key1 = pairKey(form[0][0], form[0][1]);
          const key2 = pairKey(form[1][0], form[1][1]);
          if (usedPairs.has(key1) || usedPairs.has(key2) ||
              !isPhase1GenderMatchValid_(form[0], form[1], genderMap, genderRules)) continue;

          selected.forEach(player => remaining[player]--);
          usedPairs.add(key1);
          usedPairs.add(key2);
          residualMatches.push(form);

          if (searchResidual()) return true;

          residualMatches.pop();
          usedPairs.delete(key1);
          usedPairs.delete(key2);
          selected.forEach(player => remaining[player]++);
        }
      }
      return false;
    }

    if (searchResidual()) return candidate.concat(residualMatches);
  }

  return null;
}
