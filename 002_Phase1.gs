/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function generateRound(players, targetMatches, usedPairs) {
  // Busca una round completa de matches 2v2 sin repetir compañeros.
  // Reintenta muchas veces y conserva la solución con mejor reparto de descansos
  // mediante una construcción aleatoria. La validación global se hace después.
  const n = players.length;
  const out = [];
  const remaining = {};
  players.forEach(p => remaining[p] = targetMatches);

  // Backtracking aleatorio para cada match.
  function recurse(rem, pairsUsed, matches) {
    if (matches.length * 4 >= players.length * targetMatches) return matches;
    const eligible = players.filter(p => rem[p] > 0);
    if (eligible.length < 4) return null;

    const attempts = 250;
    for (let t=0;t<attempts;t++) {
      const selected = shuffle(eligible).slice(0,4);
      // Formas aleatorias de dividir los 4 players en 2 pairs.
      const forms = shuffle([
        [[selected[0],selected[1]],[selected[2],selected[3]]],
        [[selected[0],selected[2]],[selected[1],selected[3]]],
        [[selected[0],selected[3]],[selected[1],selected[2]]]
      ]);
      for (const form of forms) {
        const k1 = pairKey(form[0][0],form[0][1]);
        const k2 = pairKey(form[1][0],form[1][1]);
        if (pairsUsed.has(k1) || pairsUsed.has(k2)) continue;
        const nextRem = Object.assign({}, rem);
        selected.forEach(p => nextRem[p]--);
        if (Object.values(nextRem).some(v => v < 0)) continue;
        const nextPairs = new Set(pairsUsed);
        nextPairs.add(k1); nextPairs.add(k2);
        const r = recurse(nextRem, nextPairs, matches.concat([form]));
        if (r) return r;
      }
    }
    return null;
  }
  return recurse(remaining, new Set(usedPairs), out);
}

function generatePhase1() {
  const ss = SpreadsheetApp.getActive();
  const cfg = getConfig();
  const players = getPlayers();
  if (players.length < 4) throw new Error('Se necesitan al menos 4 players.');
  if (cfg.matchesPerPlayer < cfg.minimumMatches) throw new Error(`El mínimo de matches por player es ${cfg.minimumMatches}.`);
  if ((players.length * cfg.matchesPerPlayer) % 4 !== 0) {
    throw new Error('Con este número de players y matches por player no se puede repartir exactamente en matches 2v2. Cambia uno de los dos valores.');
  }

  const sh = ss.getSheetByName(SHEETS.PHASE1);
  const old = sh.getLastRow();
  if (old > 1) sh.getRange(2,1,old-1,10).clearContent();

  // Construcción global. Guardamos las pairs ya usadas en todas las rounds.
  const usedPairs = new Set();
  const totalMatches = players.length * cfg.matchesPerPlayer / 4;
  const schedule = [];
  const counts = {};
  players.forEach(p => counts[p]=0);

  // Reintentos completos para evitar bloqueos en combinaciones difíciles.
  for (let attempt=0; attempt<1000; attempt++) {
    usedPairs.clear();
    schedule.length = 0;
    players.forEach(p => counts[p]=0);
    let ok = true;

    for (let m=0; m<totalMatches; m++) {
      const eligible = shuffle(players.filter(p => counts[p] < cfg.matchesPerPlayer));
      if (eligible.length < 4) { ok=false; break; }

      // Priorizamos players con más necesidad de matches.
      eligible.sort((a,b) => counts[a]-counts[b] || Math.random()-0.5);

      let found = null;
      const tries = Math.min(500, Math.max(100, players.length*20));
      for (let t=0;t<tries && !found;t++) {
        const pool = shuffle(eligible.slice(0, Math.min(8, eligible.length)));
        if (pool.length < 4) continue;
        const s = pool.slice(0,4);
        const forms = shuffle([
          [[s[0],s[1]],[s[2],s[3]]],
          [[s[0],s[2]],[s[1],s[3]]],
          [[s[0],s[3]],[s[1],s[2]]]
        ]);
        for (const f of forms) {
          const k1=pairKey(f[0][0],f[0][1]), k2=pairKey(f[1][0],f[1][1]);
          if (!usedPairs.has(k1) && !usedPairs.has(k2)) { found=f; break; }
        }
      }
      if (!found) { ok=false; break; }
      found.flat().forEach(p=>counts[p]++);
      usedPairs.add(pairKey(found[0][0],found[0][1]));
      usedPairs.add(pairKey(found[1][0],found[1][1]));
      schedule.push(found);
    }

    if (ok && Object.values(counts).every(v=>v===cfg.matchesPerPlayer)) break;
    if (attempt===999) throw new Error('No he encontrado una combinación válida. Prueba con otro número de matches por player o de participantes.');
  }

  // Ordenamos aleatoriamente los matches y dejamos la court vacía para asignación manual.
  const rows = schedule.map((f,i)=>[i+1,'',Math.floor(i/cfg.courts)+1,f[0][0],f[0][1],'VS',f[1][0],f[1][1],'','']);
  sh.getRange(2,1,rows.length,10).setValues(rows);
  sh.getRange(2,2,rows.length,1).setBackground('#fff2cc');
  sh.getRange(2,9,rows.length,2).setBackground('#d9ead3');
  sh.autoResizeColumns(1,10);
  SpreadsheetApp.getActive().toast(`Fase 1 generada: ${rows.length} matches. Introduce los scores.`);
}
