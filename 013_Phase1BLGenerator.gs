/**
 * General constraint-aware Phase 1 scheduler.
 * Supports any BL count and configured match counts (3, 4 or 5).
 * BL partner/opponent limits are independent and apply only to non-BL players.
 */
function generatePhase1ConstraintAware_(players, matchesPerPlayer, genderMap, genderRules, blMap) {
  // Fast round-based path for 12-player groups: each round gives every player
  // exactly one appearance, avoiding the expensive partial-match search.
  if (players.length === 12 && (matchesPerPlayer === 4 || matchesPerPlayer === 5) &&
      !(genderRules && (genderRules.rule1 || genderRules.rule2 || genderRules.rule3))) {
    const fastSchedule = generatePhase1TwelvePlayerRounds_(
      players, matchesPerPlayer, blMap
    );
    if (fastSchedule) return fastSchedule;
  }
  const startedAt = Date.now();
  const maxRuntimeMs = 55000;
  const maxNodes = 1000000;
  const poolLimit = Math.min(players.length, 12);
  const remaining = new Map(players.map(player => [player, matchesPerPlayer]));
  const usedPairs = new Set();
  const partnerCounts = new Map();
  const opponentCounts = new Map();
  const schedule = [];
  const girlsCoveredByRule3 = new Set();
  const rule3Enabled = !!(genderRules && genderRules.rule3);
  const isGirl = player =>
    genderMap && genderMap.get(normalizePlayerKey_(player)) === 'chica';
  const uncoveredGirls = () => players.filter(player =>
    isGirl(player) && !girlsCoveredByRule3.has(normalizePlayerKey_(player))
  );
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
    // Rule 3 cannot be recovered once an uncovered girl has no appearances left.
    if (rule3Enabled && uncoveredGirls().some(player => remaining.get(player) <= 0)) {
      return false;
    }

    const eligible = players.filter(player => remaining.get(player) > 0);
    if (eligible.length < 4) return false;
    const maxNeed = Math.max(...eligible.map(player => remaining.get(player)));
    const anchors = shuffle(eligible.filter(player => remaining.get(player) === maxNeed));
    if (rule3Enabled) {
      anchors.sort((a, b) =>
        Number(isGirl(b) && !girlsCoveredByRule3.has(normalizePlayerKey_(b))) -
        Number(isGirl(a) && !girlsCoveredByRule3.has(normalizePlayerKey_(a)))
      );
    }

    for (const anchor of anchors) {
      // Keep all still-uncovered girls in the candidate pool whenever possible.
      // Randomize equal-priority candidates, then apply deterministic priorities.
      const pool = shuffle(eligible.filter(player => player !== anchor));
      pool.sort((a, b) => {
        if (rule3Enabled) {
          const aNeeded = isGirl(a) && !girlsCoveredByRule3.has(normalizePlayerKey_(a));
          const bNeeded = isGirl(b) && !girlsCoveredByRule3.has(normalizePlayerKey_(b));
          if (aNeeded !== bNeeded) return bNeeded - aNeeded;
        }
        return remaining.get(b) - remaining.get(a);
      });
      pool.splice(poolLimit - 1);
      if (pool.length < 3) continue;

      const triples = [];
      for (let a = 0; a < pool.length - 2; a++)
        for (let b = a + 1; b < pool.length - 1; b++)
          for (let c = b + 1; c < pool.length; c++)
            triples.push([pool[a], pool[b], pool[c]]);

      // Prioriza tríos que ofrecen más opciones válidas y reservan los usos BL
      // para jugadores que todavía no han consumido cada límite.
      const tripleScore = triple => {
        const chosen = [anchor].concat(triple);
        const forms = [
          [[chosen[0], chosen[1]], [chosen[2], chosen[3]]],
          [[chosen[0], chosen[2]], [chosen[1], chosen[3]]],
          [[chosen[0], chosen[3]], [chosen[1], chosen[2]]]
        ];
        let best = Infinity;
        forms.forEach(match => {
          const [teamA, teamB] = match;
          if (!isPhase1GenderMatchValid_(teamA, teamB, genderMap, genderRules)) return;
          const pairA = pairKey(teamA[0], teamA[1]);
          const pairB = pairKey(teamB[0], teamB[1]);
          if (usedPairs.has(pairA) || usedPairs.has(pairB)) return;
          let score = 0;
          [[teamA, teamB], [teamB, teamA]].forEach(([team, opponents]) => {
            const opponentsHaveBL = opponents.some(hasBL);
            team.forEach(player => {
              if (hasBL(player)) return;
              const teammate = team[0] === player ? team[1] : team[0];
              if (hasBL(teammate)) score += 4 + 3 * (partnerCounts.get(player) || 0);
              if (opponentsHaveBL) score += 4 + 3 * (opponentCounts.get(player) || 0);
            });
          });
          if (rule3Enabled && teamA.every(isGirl) && teamB.every(isGirl)) {
            score -= 20 * match.flat().filter(player =>
              !girlsCoveredByRule3.has(normalizePlayerKey_(player))
            ).length;
          }
          best = Math.min(best, score);
        });
        return best;
      };
      const shuffledTriples = shuffle(triples);
      shuffledTriples.sort((a, b) => tripleScore(a) - tripleScore(b));

      for (const triple of shuffledTriples) {
        const chosen = [anchor].concat(triple);
        const forms = shuffle([
          [[chosen[0], chosen[1]], [chosen[2], chosen[3]]],
          [[chosen[0], chosen[2]], [chosen[1], chosen[3]]],
          [[chosen[0], chosen[3]], [chosen[1], chosen[2]]]
        ]);

        forms.sort((matchA, matchB) => {
          const score = match => {
            let value = 0;
            const [teamA, teamB] = match;
            [[teamA, teamB], [teamB, teamA]].forEach(([team, opponents]) => {
              const opponentsHaveBL = opponents.some(hasBL);
              team.forEach(player => {
                if (hasBL(player)) return;
                const teammate = team[0] === player ? team[1] : team[0];
                if (hasBL(teammate)) value += 4 + 3 * (partnerCounts.get(player) || 0);
                if (opponentsHaveBL) value += 4 + 3 * (opponentCounts.get(player) || 0);
              });
            });
            if (rule3Enabled && teamA.every(isGirl) && teamB.every(isGirl)) {
              value -= 20 * teamA.concat(teamB).filter(player =>
                !girlsCoveredByRule3.has(normalizePlayerKey_(player))
              ).length;
            }
            return value;
          };
          return score(matchA) - score(matchB);
        });

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
          const newlyCoveredGirls = [];
          if (rule3Enabled && teamA.every(isGirl) && teamB.every(isGirl)) {
            teamA.concat(teamB).forEach(player => {
              const key = normalizePlayerKey_(player);
              if (!girlsCoveredByRule3.has(key)) {
                girlsCoveredByRule3.add(key);
                newlyCoveredGirls.push(key);
              }
            });
          }
          usedPairs.add(pairA); usedPairs.add(pairB); schedule.push(match);

          if (recurse()) return true;

          schedule.pop();
          newlyCoveredGirls.forEach(key => girlsCoveredByRule3.delete(key));
          usedPairs.delete(pairA); usedPairs.delete(pairB);
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


/**
 * Builds complete rounds for 12 players. A round partitions all players into
 * three 2v2 matches; backtracking between randomized round candidates preserves
 * exact appearances while checking partner/opponent BL counters independently.
 */
function generatePhase1TwelvePlayerRounds_(players, rounds, blMap) {
  const maxRoundCandidates = 1200;
  const maxRuntimeMs = 45000;
  const startedAt = Date.now();
  const usedPairs = new Set();
  const partnerCounts = new Map();
  const opponentCounts = new Map();
  const schedule = [];
  let attempts = 0;
  const hasBL = player => blMap && blMap.get(normalizePlayerKey_(player)) === true;

  function buildCandidateRound() {
    const shuffled = shuffle(players.slice());
    const round = [];
    for (let i = 0; i < shuffled.length; i += 4) {
      const group = shuffled.slice(i, i + 4);
      const split = shuffle([
        [[group[0], group[1]], [group[2], group[3]]],
        [[group[0], group[2]], [group[1], group[3]]],
        [[group[0], group[3]], [group[1], group[2]]]
      ])[0];
      round.push(split);
    }
    return round;
  }

  function addRound(round) {
    const additions = [];
    for (const match of round) {
      const [a, b] = match;
      const pairA = pairKey(a[0], a[1]);
      const pairB = pairKey(b[0], b[1]);
      if (usedPairs.has(pairA) || usedPairs.has(pairB)) return null;
      const partner = [];
      const opponent = [];
      for (const [team, rivals] of [[a, b], [b, a]]) {
        const rivalsHaveBL = rivals.some(hasBL);
        team.forEach(player => {
          if (hasBL(player)) return;
          const teammate = team[0] === player ? team[1] : team[0];
          if (hasBL(teammate)) partner.push(player);
          if (rivalsHaveBL) opponent.push(player);
        });
      }
      if (partner.some(player => (partnerCounts.get(player) || 0) >= 1) ||
          opponent.some(player => (opponentCounts.get(player) || 0) >= 1)) return null;
      additions.push({pairA, pairB, partner, opponent});
    }
    return additions;
  }

  function applyRound(round, additions, direction) {
    additions.forEach((entry, index) => {
      const match = round[index];
      if (direction > 0) {
        usedPairs.add(entry.pairA);
        usedPairs.add(entry.pairB);
        entry.partner.forEach(player => partnerCounts.set(player, (partnerCounts.get(player) || 0) + 1));
        entry.opponent.forEach(player => opponentCounts.set(player, (opponentCounts.get(player) || 0) + 1));
        schedule.push(match);
      } else {
        schedule.pop();
        usedPairs.delete(entry.pairA);
        usedPairs.delete(entry.pairB);
        entry.partner.forEach(player => {
          const count = (partnerCounts.get(player) || 0) - 1;
          if (count) partnerCounts.set(player, count); else partnerCounts.delete(player);
        });
        entry.opponent.forEach(player => {
          const count = (opponentCounts.get(player) || 0) - 1;
          if (count) opponentCounts.set(player, count); else opponentCounts.delete(player);
        });
      }
    });
  }

  function search(roundIndex) {
    if (roundIndex === rounds) return true;
    if (Date.now() - startedAt > maxRuntimeMs) return false;
    for (let i = 0; i < maxRoundCandidates; i++) {
      if (++attempts > maxRoundCandidates * rounds) return false;
      const round = buildCandidateRound();
      const additions = addRound(round);
      if (!additions) continue;
      applyRound(round, additions, 1);
      if (search(roundIndex + 1)) return true;
      applyRound(round, additions, -1);
    }
    return false;
  }

  return search(0) ? schedule.slice() : null;
}
