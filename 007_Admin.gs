function myFunction() {
  
}
/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function configureAdministrator() {
  const email = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Google no ha podido identificar tu cuenta. Ejecuta esta función desde tu cuenta propietaria del proyecto.');
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_EMAIL', email);
  SpreadsheetApp.getActive().toast('Administrador configurado: ' + email);
  return email;
}

function isAdminUser() {
  const configured = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').trim().toLowerCase();
  const active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  return !!configured && !!active && configured === active;
}

function requireAdmin() {
  if (!isAdminUser()) {
    throw new Error('Acceso de administrador no autorizado.');
  }
}

function getAdminStatus() {
  return {
    isAdmin: isAdminUser(),
    email: isAdminUser() ? Session.getActiveUser().getEmail() : ''
  };
}

function adminGeneratePhase1() {
  requireAdmin();
  generatePhase1();
  return getPublicTournamentData();
}

function adminUpdateStandings() {
  requireAdmin();
  updateStandings();
  return getPublicTournamentData();
}

function adminGenerateGoldSilver() {
  requireAdmin();
  generateGoldSilver();
  return getPublicTournamentData();
}

function adminGenerateKnockout() {
  requireAdmin();
  generateKnockout();
  return getPublicTournamentData();
}

function adminFinishTournament() {
  requireAdmin();
  finishTournament();
  return getPublicTournamentData();
}

function adminNewTournament() {
  requireAdmin();
  // Versión web de "Nuevo tournament": no utiliza SpreadsheetApp.getUi(),
  // porque la web no tiene interfaz de Sheets. El histórico se conserva.
  const ss = SpreadsheetApp.getActive();
  [SHEETS.PHASE1,SHEETS.STANDINGS,SHEETS.FINAL_PAIRS,SHEETS.KNOCKOUT].forEach(n=>{
    const sh=ss.getSheetByName(n);
    if(sh && sh.getLastRow()>1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  });
  const panel=ss.getSheetByName(SHEETS.PANEL);
  if(panel) panel.getRange('B3:B8').setValue(false);
  return getPublicTournamentData();
}

function adminSaveResult(matchType, matchId, score1, score2) {
  requireAdmin();
  return savePublicResult(matchType, matchId, score1, score2);
}


/** Devuelve la configuración de reglas solo al administrador. */
function adminGetPhase1GenderRules() {
  requireAdmin();
  return getPhase1GenderRules_();
}

/** Guarda la configuración de reglas solo al administrador. */
function adminSavePhase1GenderRules(settings) {
  requireAdmin();
  return savePhase1GenderRules_(settings);
}
