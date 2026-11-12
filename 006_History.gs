/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function finishTournament_() {
  const ss=SpreadsheetApp.getActive();
  updateStandings_();
  const cl=ss.getSheetByName(SHEETS.STANDINGS);
  const playerHistory=ss.getSheetByName(SHEETS.PLAYER_HISTORY);
  const tournamentHistory=ss.getSheetByName(SHEETS.TOURNAMENT_HISTORY);
  const cfg=getConfig();
  const n=cl.getLastRow()-1;
  if(n<1) throw new Error('No hay clasificación.');
  const classRows=cl.getRange(2,1,n,10).getValues();

  // Detecta campeones/subcampeones desde ELIMINATORIAS usando el score.
  const winners={ORO:{},PLATA:{}};
  const ko=ss.getSheetByName(SHEETS.KNOCKOUT);
  if(ko.getLastRow()>=2){
    const rows=ko.getRange(2,1,ko.getLastRow()-1,8).getValues();
    rows.forEach(r=>{
      const group=r[0], round=String(r[1]), p1=r[3], p2=r[4], s1=readScore(r[5]), s2=readScore(r[6]);
      if(round==='Final' && s1!==null && s2!==null && p1 && p2){
        winners[group].champion=s1>s2?p1:p2;
        winners[group].runner=s1>s2?p2:p1;
      }
    });
  }

  const historyRows=playerHistory.getLastRow()>1?playerHistory.getRange(2,1,playerHistory.getLastRow()-1,13).getValues():[];
  const byPlayer={};
  historyRows.forEach(r=>{if(r[0]) byPlayer[r[0]]=r;});

  classRows.forEach(r=>{
    const player=r[1], pj=r[2], v=r[3], d=r[4], pf=r[5], pc=r[6], dif=r[7], wp=r[8];
    if(!byPlayer[player]) byPlayer[player]=[player,0,0,0,0,0,0,0,0,0,0,0,0];
    const h=byPlayer[player];
    h[1]+=1; h[2]+=pj; h[3]+=v; h[4]+=d; h[5]+=pf; h[6]+=pc; h[7]+=dif; h[8]=(h[2]?h[3]/h[2]:0);
    const champGold=winners.ORO.champion||'', runnerGold=winners.ORO.runner||'';
    const champSilver=winners.PLATA.champion||'', runnerSilver=winners.PLATA.runner||'';
    if(champGold && champGold.split(' / ').includes(player)) h[9]+=1;
    if(runnerGold && runnerGold.split(' / ').includes(player)) h[10]+=1;
    if(champSilver && champSilver.split(' / ').includes(player)) h[11]+=1;
    if(runnerSilver && runnerSilver.split(' / ').includes(player)) h[12]+=1;
  });

  if(playerHistory.getLastRow()>1) playerHistory.getRange(2,1,playerHistory.getLastRow()-1,13).clearContent();
  const finalHistory=Object.values(byPlayer);
  if(finalHistory.length) playerHistory.getRange(2,1,finalHistory.length,13).setValues(finalHistory);
  playerHistory.getRange(2,9,Math.max(1,finalHistory.length),1).setNumberFormat('0.0%');

  const existingKeys=new Set();
  if(tournamentHistory.getLastRow()>1){
    const old=tournamentHistory.getRange(2,1,tournamentHistory.getLastRow()-1,12).getValues();
    old.forEach(r=>existingKeys.add(String(r[0])+'|'+r[1]+'|'+r[2]));
  }
  const newRows=[];
  classRows.forEach(r=>{
    const key=String(cfg.date)+'|'+cfg.name+'|'+r[1];
    if(!existingKeys.has(key)){
      let finalComp='', finalResult='';
      if(winners.ORO.champion && winners.ORO.champion.split(' / ').includes(r[1])) {finalComp='ORO';finalResult='CAMPEÓN';}
      else if(winners.ORO.runner && winners.ORO.runner.split(' / ').includes(r[1])) {finalComp='ORO';finalResult='SUBCAMPEÓN';}
      else if(winners.PLATA.champion && winners.PLATA.champion.split(' / ').includes(r[1])) {finalComp='PLATA';finalResult='CAMPEÓN';}
      else if(winners.PLATA.runner && winners.PLATA.runner.split(' / ').includes(r[1])) {finalComp='PLATA';finalResult='SUBCAMPEÓN';}
      newRows.push([cfg.date,cfg.name,r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],finalComp,finalResult]);
    }
  });
  if(newRows.length) tournamentHistory.getRange(tournamentHistory.getLastRow()+1,1,newRows.length,12).setValues(newRows);
  SpreadsheetApp.getActive().toast('Torneo finalizado y añadido al histórico.');
}

function newTournament_() {
  const ui=SpreadsheetApp.getUi();
  const ans=ui.alert('Nuevo tournament','¿Seguro que quieres borrar los data del tournament actual? El histórico NO se borrará.',ui.ButtonSet.YES_NO);
  if(ans!==ui.Button.YES) return;
  const ss=SpreadsheetApp.getActive();
  [SHEETS.PHASE1,SHEETS.STANDINGS,SHEETS.FINAL_PAIRS,SHEETS.KNOCKOUT].forEach(n=>{
    const sh=ss.getSheetByName(n);
    if(sh && sh.getLastRow()>1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  });
  const panel=ss.getSheetByName(SHEETS.PANEL);
  panel.getRange('B3:B8').setValue(false);
  SpreadsheetApp.getUi().alert('Torneo actual limpio. El histórico se mantiene.');
}

function onEdit(e) {
  if(!e || !e.range) return;
  const sh=e.range.getSheet();
  if(sh.getName()!=='PANEL' || e.range.getColumn()!==2 || e.range.getRow()<3 || e.range.getRow()>8) return;
  if(e.value!=='TRUE') return;
  const row=e.range.getRow();
  try {
    if(row===3) generatePhase1_();
    if(row===4) updateStandings_();
    if(row===5) generateGoldSilver_();
    if(row===6) generateKnockout_();
    if(row===7) finishTournament_();
    if(row===8) newTournament_();
  } catch(err) {
    SpreadsheetApp.getActive().toast(String(err.message || err));
  } finally {
    e.range.setValue(false);
  }
}
