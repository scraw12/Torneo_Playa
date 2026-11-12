/**
 * General constraint-aware Phase 1 scheduler.
 * Supports any BL count and configured match counts (3, 4 or 5).
 * BL partner/opponent limits are independent and apply only to non-BL players.
 */
function generatePhase1ConstraintAware_(players, matchesPerPlayer, genderMap, genderRules, blMap) {
  const startedAt = Date.now();
  const maxRuntimeMs = 40000;
  const maxNodes = 90000;
  const poolLimit = Math.min(players.length, 9);
  const remaining = new Map(players.map(player => [player, matchesPerPlayer]));
  const usedPairs = new Set();
  const partnerCounts = new Map();
  const opponentCounts = new Map();
  const schedule = [];
  let nodes = 0;

  const hasBL = player => blMap && blMap.get(normalizePlayerKey_(player)) === true;
  const countSeats = () => {
    let total = 0;
    remaining.forEach(value => total += value);
    return total;
  };

  function recurse() {
    if (++nodes > maxNodes || Date.now() - startedAt > maxRuntimeMs) return false;
    const seats = countSeats();
    if (seats === 0) {
      return schedule.length === players.length * matchesPerPlayer / 4 &&
        validatePhase1GenderSchedule_(schedule, genderMap, genderRules).valid &&
        (!blMap || validatePhase1BLSchedule_(schedule, blMap).valid);
    }
    if (seats % 4 !== 0) return false;

    const eligible = players.filter(player => remaining.get(player) > 0);
    if (eligible.length < 4) return false;
    const maxNeed = Math.max(...eligible.map(player => remaining.get(player)));
    const anchors = shuffle(eligible.filter(player => remaining.get(player) === maxNeed));

    for (const anchor of anchors) {
      const pool = shuffle(eligible.filter(player => player !== anchor)
        .sort((a, b) => remaining.get(b) - remaining.get(a)))
        .slice(0, poolLimit - 1);
      if (pool.length < 3) continue;

      const triples = [];
      for (let a = 0; a < pool.length - 2; a++)
        for (let b = a + 1; b < pool.length - 1; b++)
          for (let c = b + 1; c < pool.length; c++)
            triples.push([pool[a], pool[b], pool[c]]);

      for (const triple of shuffle(triples)) {
        const chosen = [anchor].concat(triple);
        const forms = shuffle([
          [[chosen[0], chosen[1]], [chosen[2], chosen[3]]],
          [[chosen[0], chosen[2]], [chosen[1], chosen[3]]],
          [[chosen[0], chosen[3]], [chosen[1], chosen[2]]]
        ]);

        for (const match of forms) {
          const [teamA, teamB] = match;
          const pairA = pairKey(teamA[0], teamA[1]);
          const pairB = pairKey(teamB[0], teamB[1]);
          if (usedPairs.has(pairA) || usedPairs.has(pairB) ||
              !isPhase1GenderMatchValid_(teamA, teamB, genderMap, genderRules)) continue;

          const partnerAdds = [];
          const opponentAdds = [];
          let valid = true;

          for (const [team, opposingTeam] of [[teamA, teamB], [teamB, teamA]]) {
            const opposingHasBL = opposingTeam.some(hasBL);
            for (const player of team) {
              if (hasBL(player)) continue;
              if (hasBL(team[0] === player ? team[1] : team[0])) {
                if ((partnerCounts.get(player) || 0) >= 1) valid = false;
                partnerAdds.push(player);
              }
              if (opposingHasBL) {
                if ((opponentCounts.get(player) || 0) >= 1) valid = false;
                opponentAdds.push(player);
              }
            }
          }
          if (!valid) continue;

          chosen.forEach(player => remaining.set(player, remaining.get(player) - 1));
          partnerAdds.forEach(player => partnerCounts.set(player, (partnerCounts.get(player) || 0) + 1));
          opponentAdds.forEach(player => opponentCounts.set(player, (opponentCounts.get(player) || 0) + 1));
          usedPairs.add(pairA); usedPairs.add(pairB); schedule.push(match);

          if (recurse()) return true;

          schedule.pop(); usedPairs.delete(pairA); usedPairs.delete(pairB);
          partnerAdds.forEach(player => {
            const n = (partnerCounts.get(player) || 0) - 1;
            if (n) partnerCounts.set(player, n); else partnerCounts.delete(player);
          });
          opponentAdds.forEach(player => {
            const n = (opponentCounts.get(player) || 0) - 1;
            if (n) opponentCounts.set(player, n); else opponentCounts.delete(player);
          });
          chosen.forEach(player => remaining.set(player, remaining.get(player) + 1));

          if (nodes >= maxNodes || Date.now() - startedAt > maxRuntimeMs) return false;
        }
      }
    }
    return false;
  }

  return recurse() ? schedule.slice() : null;
}
