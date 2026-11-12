/**
 * TORNEO 2x2 VOLEY PLAYA - ADMIN AUTHENTICATION
 *
 * Admin accounts are stored in Script Properties as salted PBKDF2-HMAC-SHA256
 * hashes. Browser sessions are random bearer tokens held in Script Cache.
 */

const ADMIN_USERS_PROPERTY = 'ADMIN_USERS_JSON';
const ADMIN_SESSION_TTL_SECONDS = 21600;
const ADMIN_PASSWORD_ITERATIONS = 15000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCK_SECONDS = 900;

/**
 * Run once from the Apps Script editor with the project owner's Google account.
 * Existing ADMIN_EMAIL values are preserved unless they belong to another user.
 */
function configureAdministrator() {
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!activeEmail || !effectiveEmail || activeEmail !== effectiveEmail) {
    throw new Error('Ejecuta esta función desde el editor de Apps Script con la cuenta propietaria del proyecto.');
  }

  const properties = PropertiesService.getScriptProperties();
  const configured = String(properties.getProperty('ADMIN_EMAIL') || '').trim().toLowerCase();
  if (configured && configured !== activeEmail) {
    throw new Error('Ya existe otro propietario configurado. No se ha cambiado la configuración.');
  }

  properties.setProperty('ADMIN_EMAIL', activeEmail);
  properties.setProperty('ADMIN_OWNER_EMAIL', activeEmail);
  SpreadsheetApp.getActive().toast('Propietario de administración configurado: ' + activeEmail);
  return activeEmail;
}

/** Only the configured project owner, running from the editor, can manage accounts. */
function requireEditorOwner_() {
  const properties = PropertiesService.getScriptProperties();
  const ownerEmail = String(
    properties.getProperty('ADMIN_OWNER_EMAIL') ||
    properties.getProperty('ADMIN_EMAIL') || ''
  ).trim().toLowerCase();
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();

  if (!ownerEmail || !activeEmail || !effectiveEmail ||
      activeEmail !== ownerEmail || effectiveEmail !== ownerEmail) {
    throw new Error('Esta operación solo puede realizarla el propietario desde el editor de Apps Script.');
  }
}

/** Open the account manager from the Apps Script editor. */
function openAdminUserSetup() {
  requireEditorOwner_();
  const html = HtmlService.createHtmlOutputFromFile('AdminUserSetup')
    .setWidth(440)
    .setHeight(520);
  SpreadsheetApp.getUi().showModalDialog(html, 'Usuarios de administración');
}

/** Create a username/password account. This endpoint is owner-editor only. */
function createAdminUserFromEditor(username, password) {
  requireEditorOwner_();

  const normalizedUsername = normalizeAdminUsername_(username);
  const rawPassword = String(password || '');
  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    throw new Error('El usuario debe tener entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.');
  }
  if (rawPassword.length < 12 || rawPassword.length > 128) {
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }

  const users = getAdminUsers_();
  if (users.some(user => user.username === normalizedUsername)) {
    throw new Error('Ese nombre de usuario ya existe.');
  }

  const salt = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  users.push({
    username: normalizedUsername,
    salt: salt,
    hash: deriveAdminPasswordHash_(rawPassword, salt, ADMIN_PASSWORD_ITERATIONS),
    iterations: ADMIN_PASSWORD_ITERATIONS,
    createdAt: new Date().toISOString()
  });
  saveAdminUsers_(users);
  return { ok: true, username: normalizedUsername };
}

/** List usernames only; password hashes and salts are never returned to the browser. */
function listAdminUsersFromEditor() {
  requireEditorOwner_();
  return getAdminUsers_().map(user => user.username).sort();
}

/** Revoke an account. Existing sessions stop working on their next request. */
function removeAdminUserFromEditor(username) {
  requireEditorOwner_();
  const normalizedUsername = normalizeAdminUsername_(username);
  const users = getAdminUsers_();
  const filtered = users.filter(user => user.username !== normalizedUsername);
  if (filtered.length === users.length) throw new Error('No se ha encontrado ese usuario.');
  if (!filtered.length) throw new Error('No puedes eliminar la última cuenta de administración.');
  saveAdminUsers_(filtered);
  return { ok: true, username: normalizedUsername };
}

function normalizeAdminUsername_(username) {
  return String(username || '').trim().toLowerCase();
}

function getAdminUsers_() {
  const raw = PropertiesService.getScriptProperties().getProperty(ADMIN_USERS_PROPERTY);
  if (!raw) return [];
  try {
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users.filter(user =>
      user && typeof user.username === 'string' &&
      typeof user.salt === 'string' && typeof user.hash === 'string'
    ) : [];
  } catch (error) {
    throw new Error('La configuración de usuarios administradores está dañada.');
  }
}

function saveAdminUsers_(users) {
  PropertiesService.getScriptProperties().setProperty(ADMIN_USERS_PROPERTY, JSON.stringify(users));
}

function deriveAdminPasswordHash_(password, salt, iterations) {
  const passwordBytes = Utilities.newBlob(String(password), 'text/plain').getBytes();
  const saltBytes = Utilities.newBlob(String(salt), 'text/plain').getBytes();
  let u = Utilities.computeHmacSha256Signature(
    saltBytes.concat([0, 0, 0, 1]),
    passwordBytes
  );
  const derived = u.slice();

  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, passwordBytes);
    for (let j = 0; j < derived.length; j++) {
      derived[j] = ((derived[j] ^ u[j]) << 24) >> 24;
    }
  }
  return Utilities.base64Encode(derived);
}

function adminSessionCacheKey_(token) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token || ''),
    Utilities.Charset.UTF_8
  );
  return 'ADMIN_SESSION_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function findAdminUser_(username) {
  return getAdminUsers_().find(user => user.username === username) || null;
}

function constantTimeStringEquals_(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Username/password login. The raw password is never persisted. */
function loginAdmin(username, password) {
  const normalizedUsername = normalizeAdminUsername_(username);
  const rawPassword = String(password || '');
  const cache = CacheService.getScriptCache();
  const attemptDigest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, normalizedUsername, Utilities.Charset.UTF_8
  )).replace(/=+$/g, '');
  const attemptKey = 'ADMIN_LOGIN_ATTEMPTS_' + attemptDigest;
  const attempts = Number(cache.get(attemptKey) || 0);

  if (attempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    throw new Error('Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.');
  }

  const user = findAdminUser_(normalizedUsername);
  const salt = user ? user.salt : 'invalid-admin-user-salt';
  const iterations = user ? Number(user.iterations) || ADMIN_PASSWORD_ITERATIONS : ADMIN_PASSWORD_ITERATIONS;
  const candidateHash = deriveAdminPasswordHash_(rawPassword, salt, iterations);
  const valid = !!user && constantTimeStringEquals_(candidateHash, user.hash);

  if (!valid) {
    cache.put(attemptKey, String(attempts + 1), ADMIN_LOGIN_LOCK_SECONDS);
    throw new Error('Usuario o contraseña incorrectos.');
  }

  cache.remove(attemptKey);
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const session = { username: user.username, createdAt: new Date().toISOString() };
  cache.put(adminSessionCacheKey_(token), JSON.stringify(session), ADMIN_SESSION_TTL_SECONDS);
  return { ok: true, token: token, username: user.username };
}

function getAdminSession_(token) {
  const rawToken = String(token || '');
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) return null;

  const cache = CacheService.getScriptCache();
  const key = adminSessionCacheKey_(rawToken);
  const rawSession = cache.get(key);
  if (!rawSession) return null;

  let session;
  try {
    session = JSON.parse(rawSession);
  } catch (error) {
    cache.remove(key);
    return null;
  }

  // Removing an account also invalidates all of its existing sessions.
  if (!findAdminUser_(String(session.username || ''))) {
    cache.remove(key);
    return null;
  }

  cache.put(key, rawSession, ADMIN_SESSION_TTL_SECONDS);
  return session;
}

function validateAdminSession(token) {
  const session = getAdminSession_(token);
  return session
    ? { valid: true, username: session.username }
    : { valid: false };
}

function logoutAdmin(token) {
  const rawToken = String(token || '');
  if (/^[a-f0-9]{64}$/i.test(rawToken)) {
    CacheService.getScriptCache().remove(adminSessionCacheKey_(rawToken));
  }
  return { ok: true };
}

function requireAdmin(sessionToken) {
  const session = getAdminSession_(sessionToken);
  if (!session) {
    throw new Error('La sesión de administración ha caducado. Vuelve a iniciar sesión.');
  }
  return session;
}

function getAdminStatus(sessionToken) {
  const session = requireAdmin(sessionToken);
  return { isAdmin: true, username: session.username };
}

function adminGeneratePhase1(sessionToken) {
  requireAdmin(sessionToken);
  generatePhase1_();
  return getPublicTournamentData();
}

function adminUpdateStandings(sessionToken) {
  requireAdmin(sessionToken);
  updateStandings_();
  return getPublicTournamentData();
}

function adminGenerateGoldSilver(sessionToken) {
  requireAdmin(sessionToken);
  generateGoldSilver_();
  return getPublicTournamentData();
}

function adminGenerateKnockout(sessionToken) {
  requireAdmin(sessionToken);
  generateKnockout_();
  return getPublicTournamentData();
}

function adminFinishTournament(sessionToken) {
  requireAdmin(sessionToken);
  finishTournament_();
  return getPublicTournamentData();
}

function adminNewTournament(sessionToken) {
  requireAdmin(sessionToken);
  const ss = SpreadsheetApp.getActive();
  [SHEETS.PHASE1, SHEETS.STANDINGS, SHEETS.FINAL_PAIRS, SHEETS.KNOCKOUT].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });
  const panel = ss.getSheetByName(SHEETS.PANEL);
  if (panel) panel.getRange('B3:B8').setValue(false);
  return getPublicTournamentData();
}

function adminSaveResult(sessionToken, matchType, matchId, score1, score2) {
  requireAdmin(sessionToken);
  return savePublicResult(matchType, matchId, score1, score2);
}

function adminGetPhase1GenderRules(sessionToken) {
  requireAdmin(sessionToken);
  return getPhase1GenderRules_();
}

function adminSavePhase1GenderRules(sessionToken, settings) {
  requireAdmin(sessionToken);
  return savePhase1GenderRules_(settings);
}

function adminGetPhase1BLRule(sessionToken) {
  requireAdmin(sessionToken);
  return getPhase1BLRule_();
}

function adminSavePhase1BLRule(sessionToken, enabled) {
  requireAdmin(sessionToken);
  return savePhase1BLRule_(enabled);
}


/**
 * Spreadsheet menu handlers. They are intentionally owner-only; the Web App
 * uses the session-protected adminGenerate*/adminUpdate* endpoints above.
 */
function generatePhase1() {
  requireEditorOwner_();
  generatePhase1_();
}
function updateStandings() {
  requireEditorOwner_();
  updateStandings_();
}
function generateGoldSilver() {
  requireEditorOwner_();
  generateGoldSilver_();
}
function generateKnockout() {
  requireEditorOwner_();
  generateKnockout_();
}
function finishTournament() {
  requireEditorOwner_();
  finishTournament_();
}
function newTournament() {
  requireEditorOwner_();
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert('Nuevo torneo', '¿Seguro que quieres borrar los datos del torneo actual? El histórico NO se borrará.', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  const ss = SpreadsheetApp.getActive();
  [SHEETS.PHASE1, SHEETS.STANDINGS, SHEETS.FINAL_PAIRS, SHEETS.KNOCKOUT].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });
  const panel = ss.getSheetByName(SHEETS.PANEL);
  if (panel) panel.getRange('B3:B8').setValue(false);
  ui.alert('Torneo actual limpio. El histórico se mantiene.');
}
