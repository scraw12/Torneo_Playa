/** Unit/integration checks for the custom administrator authentication. */
function test007AdminAuthentication() {
  const properties = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  const previousUsers = properties.getProperty(ADMIN_USERS_PROPERTY);
  const username = 'zz_test_admin_auth';
  const password = 'Test-Admin-Password-2026';
  const salt = 'test-only-salt-007';
  const iterations = 64;
  let token = '';

  try {
    const hash = deriveAdminPasswordHash_(password, salt, iterations);
    phase1TestAssert_(hash === deriveAdminPasswordHash_(password, salt, iterations),
      'La derivación de contraseña debe ser determinista con la misma sal.');
    phase1TestAssert_(hash !== deriveAdminPasswordHash_(password, 'different-salt', iterations),
      'Una sal diferente debe producir un hash distinto.');
    phase1TestAssert_(normalizeAdminUsername_('  Test.User  ') === 'test.user',
      'El nombre de usuario debe normalizarse a minúsculas y sin espacios externos.');
    phase1TestAssert_(constantTimeStringEquals_('same-value', 'same-value'),
      'La comparación debe aceptar valores iguales.');
    phase1TestAssert_(!constantTimeStringEquals_('same-value', 'other-value'),
      'La comparación debe rechazar valores distintos.');

    properties.setProperty(ADMIN_USERS_PROPERTY, JSON.stringify([{
      username: username,
      salt: salt,
      hash: hash,
      iterations: iterations,
      createdAt: new Date().toISOString()
    }]));

    const login = loginAdmin(username, password);
    token = login.token;
    phase1TestAssert_(login.ok && login.username === username,
      'El inicio de sesión debe devolver la cuenta autenticada.');
    const session = validateAdminSession(token);
    phase1TestAssert_(session.valid && session.username === username,
      'El token debe validar la sesión recién creada.');

    logoutAdmin(token);
    token = '';
    phase1TestAssert_(!validateAdminSession(login.token).valid,
      'Cerrar sesión debe invalidar el token.');

    const secondLogin = loginAdmin(username, password);
    token = secondLogin.token;
    properties.setProperty(ADMIN_USERS_PROPERTY, JSON.stringify([]));
    phase1TestAssert_(!validateAdminSession(token).valid,
      'Eliminar una cuenta debe invalidar sus sesiones existentes.');

    return { skipped: false, authentication: 'passed' };
  } finally {
    if (token) logoutAdmin(token);
    if (previousUsers == null) properties.deleteProperty(ADMIN_USERS_PROPERTY);
    else properties.setProperty(ADMIN_USERS_PROPERTY, previousUsers);
  }
}