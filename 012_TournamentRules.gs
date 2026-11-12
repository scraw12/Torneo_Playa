/**
 * REGLAS DE GÉNERO PARA EL TORNEO
 *
 * Este fichero centraliza las reglas que dependen del campo "Genero"
 * de la hoja JUGADORES. El género se utiliza solo en el backend:
 * no debe añadirse a los datos públicos ni mostrarse en la Web App.
 *
 * Valores admitidos en JUGADORES: "Chico" y "Chica".
 */

/**
 * REGLA 1 - FASE 1:
 * Una pareja formada por dos chicas solo puede enfrentarse a otra pareja
 * formada por dos chicas. Los equipos que no sean dos chicas pueden
 * enfrentarse entre sí.
 *
 * Devuelve un mapa nombre normalizado -> género para los jugadores activos.
 * La columna se localiza por su cabecera "Genero", independientemente
 * de la posición en la hoja.
 */
function getPhase1GenderMap_(players) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.PLAYERS);
  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error('No se encuentran jugadores para comprobar la regla de género.');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const genderColumn = headers.findIndex(value =>
    normalizeGenderHeader_(value) === 'genero'
  );
  if (genderColumn < 0) {
    throw new Error('Falta la columna "Genero" en la hoja JUGADORES.');
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const activeGenders = new Map();
  rows.forEach(row => {
    const name = String(row[0] || '').trim();
    const active = row[1] === true || row[1] === '' ||
      String(row[1]).trim().toLowerCase() === 'true';
    if (!name || !active) return;
    const key = normalizePlayerKey_(name);
    const gender = normalizePlayerGender_(row[genderColumn]);
    if (activeGenders.has(key)) {
      throw new Error('Hay jugadores activos duplicados en JUGADORES: ' + name + '.');
    }
    if (!gender) {
      throw new Error('Indica "Chico" o "Chica" en la columna Genero para ' + name + '.');
    }
    activeGenders.set(key, gender);
  });

  players.forEach(name => {
    if (!activeGenders.has(normalizePlayerKey_(name))) {
      throw new Error('No se ha podido leer el género del jugador ' + name + '.');
    }
  });
  return activeGenders;
}

/**
 * Comprueba un enfrentamiento 2 contra 2 aplicando la Regla 1.
 * team1 y team2 son arrays de dos nombres.
 */
function isPhase1GenderMatchValid_(team1, team2, genderMap) {
  const isAllGirls = team => team.every(name =>
    genderMap.get(normalizePlayerKey_(name)) === 'chica'
  );
  const team1AllGirls = isAllGirls(team1);
  const team2AllGirls = isAllGirls(team2);
  return team1AllGirls === team2AllGirls;
}

/**
 * Valida todos los partidos de un calendario antes de guardarlo.
 * Se usa también como comprobación defensiva tras construir el calendario.
 */
function validatePhase1GenderSchedule_(matches, genderMap) {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!isPhase1GenderMatchValid_(match[0], match[1], genderMap)) {
      return {
        valid: false,
        matchNumber: i + 1,
        team1: match[0].slice(),
        team2: match[1].slice()
      };
    }
  }
  return { valid: true };
}

/** Normaliza la cabecera para localizar "Genero" aunque lleve tilde. */
function normalizeGenderHeader_(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normaliza nombres para comparar jugadores sin distinguir mayúsculas/espacios. */
function normalizePlayerKey_(value) {
  return String(value || '').trim().toLowerCase();
}

/** Devuelve "chico", "chica" o vacío si el valor no es válido. */
function normalizePlayerGender_(value) {
  const gender = String(value || '').trim().toLowerCase();
  if (gender === 'chico') return 'chico';
  if (gender === 'chica') return 'chica';
  return '';
}
