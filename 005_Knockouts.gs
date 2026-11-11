/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function bracketRounds(numPairs) {
  // Crea un cuadro razonable: si no es potencia de 2, los byes entran en la
  // primera round necesaria para llegar a la siguiente potencia de 2.
  if(numPairs<2) return [];
  let size=1; while(size<numPairs) size*=2;
  if(size===numPairs) {
    return [numPairs/2, numPairs/4, numPairs/8, numPairs/16].filter(x=>x>=1);
  }
  // Primeros matches: numPairs - size/2; winners + byes => size/2.
  const first=size/2;
  const playIn=numPairs-first;
  const rounds=[playIn];
  let current=first;
  while(current>=2){ rounds.push(current/2); current/=2; }
  return rounds;
}

/**
 * Returns the two teams that must be placed on opposite halves of the bracket:
 * the team containing the highest-ranked player, and the team containing the
 * highest-ranked player who is NOT that player's teammate.
 *
 * ORO_PLATA columns: category, individual position, player, teammate, pair ID.
 */
function getProtectedBracketTeams(group) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.FINAL_PAIRS);
  if (!sh || sh.getLastRow() < 2) return [];

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues()
    .filter(row => String(row[0]) === group && row[2] && row[4])
    .sort((a, b) => Number(a[1]) - Number(b[1]));

  if (rows.length < 2) return [];

  const topPairId = String(rows[0][4]);
  const rivalSeed = rows.find(row => String(row[4]) !== topPairId);
  if (!rivalSeed) return [];

  const rivalPairId = String(rivalSeed[4]);
  const teamNames = pairId => {
    const teamRows = rows.filter(row => String(row[4]) === pairId);
    if (!teamRows.length) return null;
    const names = [...new Set(teamRows.map(row => String(row[2]).trim()).filter(Boolean))];
    if (names.length === 1 && teamRows[0][3]) {
      names.push(String(teamRows[0][3]).trim());
    }
    return names.length ? names.join(' / ') : null;
  };

  return [teamNames(topPairId), teamNames(rivalPairId)].filter(Boolean);
}

function bracketTeamKey(team) {
  return String(team || '').split(' / ').map(name => name.trim()).filter(Boolean).sort().join('|');
}

/** Randomizes slots while fixing the two protected teams in opposite halves. */
function seedBracketSlots(slots, protectedTeams) {
  const shuffled = shuffle(slots);
  if (shuffled.length < 2 || !protectedTeams || protectedTeams.length < 2) return shuffled;

  const protectedKeys = protectedTeams.map(bracketTeamKey);
  const firstIndex = shuffled.findIndex(team => bracketTeamKey(team) === protectedKeys[0]);
  const secondIndex = shuffled.findIndex(team => bracketTeamKey(team) === protectedKeys[1]);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) return shuffled;

  const firstTeam = shuffled[firstIndex];
  const secondTeam = shuffled[secondIndex];
  const rest = shuffled.filter((_, index) => index !== firstIndex && index !== secondIndex);
  const result = new Array(shuffled.length);
  const secondHalfIndex = shuffled.length === 2 ? 1 : shuffled.length / 2;
  result[0] = firstTeam;
  result[secondHalfIndex] = secondTeam;
  // Do not use result.map() here: new Array(length) creates sparse slots,
  // and map() skips those empty indexes. Collect open positions explicitly.
  const open = [];
  for (let index = 0; index < result.length; index++) {
    if (result[index] === undefined) open.push(index);
  }
  shuffle(rest).forEach((team, index) => {
    if (index < open.length) result[open[index]] = team;
  });
  return result;
}

function generateKnockout() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.KNOCKOUT);
  const all = [];

  ['ORO', 'PLATA'].forEach(group => {
    const pairs = getFinalPairs(group);
    const n = pairs.length;
    if (n < 2) return;

    let size = 1;
    while (size < n) size *= 2;

    const protectedTeams = getProtectedBracketTeams(group);
    let slots = pairs.map(pair => pair.join(' / '));
    while (slots.length < size) slots.push('PENDIENTE');

    // Non-power-of-two bracket: preliminaries feed a smaller power-of-two bracket.
    if (n > size / 2 && n < size) {
      const playIn = n - size / 2;
      const directCount = size - n;
      const protectedKeys = protectedTeams.map(bracketTeamKey);
      let source = shuffle(slots.slice(0, n));
      let protectedPrelimWinner = null;

      if (protectedTeams.length >= 2 && directCount === 1) {
        // Only one bye is available: the top seed gets it, and the other protected
        // team enters a preliminary. Its winner is then seeded in the opposite half.
        const topKey = protectedKeys[0];
        const rivalKey = protectedKeys[1];
        const topTeam = source.find(team => bracketTeamKey(team) === topKey);
        const rivalTeam = source.find(team => bracketTeamKey(team) === rivalKey);
        const others = shuffle(source.filter(team =>
          bracketTeamKey(team) !== topKey && bracketTeamKey(team) !== rivalKey));
        const prelimTeams = [rivalTeam, ...others.slice(0, 2 * playIn - 1)];
        const direct = [topTeam];
        const prelimMatches = [];
        for (let i = 0; i < playIn; i++) {
          const p1 = prelimTeams[i * 2] || 'PENDIENTE';
          const p2 = prelimTeams[i * 2 + 1] || 'PENDIENTE';
          const id = `${group}-P-${i + 1}`;
          all.push([group, 'Previa', id, p1, p2, '', '', '']);
          prelimMatches.push(`Ganador ${id}`);
          if (bracketTeamKey(p1) === rivalKey || bracketTeamKey(p2) === rivalKey) {
            protectedPrelimWinner = `Ganador ${id}`;
          }
        }
        let first = prelimMatches.concat(direct);
        while (first.length < size / 2) first.push('PENDIENTE');
        first = shuffle(first);
        if (protectedPrelimWinner) {
          const topIndex = first.findIndex(team => bracketTeamKey(team) === topKey);
          const rivalIndex = first.indexOf(protectedPrelimWinner);
          if (topIndex >= 0 && rivalIndex >= 0) {
            const targetRivalIndex = first.length === 2 ? 1 : first.length / 2;
            [first[rivalIndex], first[targetRivalIndex]] = [first[targetRivalIndex], first[rivalIndex]];
            const newTopIndex = first.findIndex(team => bracketTeamKey(team) === topKey);
            if (newTopIndex !== 0) [first[0], first[newTopIndex]] = [first[newTopIndex], first[0]];
          }
        }
        createBracketRounds(all, group, first, size / 2);
        return;
      }

      // If there are at least two byes, protect both seeded teams from the preliminaries.
      if (protectedTeams.length >= 2 && directCount >= 2) {
        const protectedSet = new Set(protectedKeys);
        const protectedSlots = protectedTeams.slice();
        const others = shuffle(source.filter(team => !protectedSet.has(bracketTeamKey(team))));
        const prelimTeams = others.slice(0, 2 * playIn);
        const direct = protectedSlots.concat(others.slice(2 * playIn));
        for (let i = 0; i < playIn; i++) {
          const id = `${group}-P-${i + 1}`;
          all.push([group, 'Previa', id,
            prelimTeams[i * 2] || 'PENDIENTE', prelimTeams[i * 2 + 1] || 'PENDIENTE', '', '', '']);
        }
        let first = [];
        for (let i = 0; i < playIn; i++) first.push(`Ganador ${group}-P-${i + 1}`);
        first = first.concat(direct);
        first = seedBracketSlots(first, protectedTeams);
        while (first.length < size / 2) first.push('PENDIENTE');
        createBracketRounds(all, group, first, size / 2);
        return;
      }

      // Fallback for unusual small brackets: retain random assignment, then seed where possible.
      const playInTeams = source.slice(0, playIn * 2);
      const direct = source.slice(playIn * 2);
      const winners = [];
      for (let i = 0; i < playIn; i++) {
        const id = `${group}-P-${i + 1}`;
        all.push([group, 'Previa', id,
          playInTeams[i] || 'PENDIENTE', playInTeams[i + playIn] || 'PENDIENTE', '', '', '']);
        winners.push(`Ganador ${id}`);
      }
      let first = winners.concat(direct.slice(0, Math.max(0, size / 2 - playIn)));
      while (first.length < size / 2) first.push('PENDIENTE');
      first = seedBracketSlots(first, protectedTeams);
      createBracketRounds(all, group, first, size / 2);
      return;
    }

    slots = seedBracketSlots(slots, protectedTeams);
    createBracketRounds(all, group, slots, size);
  });

  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
  if (all.length) sh.getRange(2, 1, all.length, 8).setValues(all);
  sh.autoResizeColumns(1, 8);
  SpreadsheetApp.getActive().toast('Cuadros de ORO y PLATA generados. Los dos equipos protegidos quedan en mitades opuestas.');
}

function createBracketRounds(all,group,slots,size) {
  const firstRoundName = size===8 ? 'Cuartos de final' :
                         size===4 ? 'Semifinales' :
                         size===2 ? 'Final' : 'Ronda 1';

  for(let i=0;i<size;i+=2){
    all.push([group,firstRoundName,`${group}-R1-${Math.floor(i/2)+1}`,
      slots[i]||'PENDIENTE',slots[i+1]||'PENDIENTE','','','']);
  }

  let prevCount=size/2;
  let roundIndex=2;
  while(prevCount>1){
    const roundName = prevCount===4 ? 'Semifinales' :
                      prevCount===2 ? 'Final' :
                      `Ronda ${roundIndex}`;
    const matches=prevCount/2;
    for(let m=1;m<=matches;m++){
      all.push([group,roundName,`${group}-R${roundIndex}-${m}`,
        `Ganador ${group}-R${roundIndex-1}-${(m*2)-1}`,
        `Ganador ${group}-R${roundIndex-1}-${m*2}`,
        '','','']);
    }
    prevCount=matches;
    roundIndex++;
  }
}
