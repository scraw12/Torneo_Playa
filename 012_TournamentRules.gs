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
 * Lee las reglas independientes de Fase 1.
 * Regla 1 se mantiene activada por defecto; Reglas 2 y 3 empiezan desactivadas.
 */
function getPhase1GenderRules_() {
  const properties = PropertiesService.getScriptProperties();
  const rule1Value = properties.getProperty('PHASE1_GENDER_RULE_1');
  const rule2Value = properties.getProperty('PHASE1_GENDER_RULE_2');
  const rule3Value = properties.getProperty('PHASE1_GENDER_RULE_3');
  return {
    rule1: rule1Value === null ? true : rule1Value === 'true',
    rule2: rule2Value === null ? false : rule2Value === 'true',
    rule3: rule3Value === null ? false : rule3Value === 'true'
  };
}

/** Guarda las tres reglas de forma independiente. */
function savePhase1GenderRules_(settings) {
  if (!settings || typeof settings.rule1 !== 'boolean' ||
      typeof settings.rule2 !== 'boolean' || typeof settings.rule3 !== 'boolean') {
    throw new Error('La configuración de reglas no es válida.');
  }
  PropertiesService.getScriptProperties().setProperties({
    PHASE1_GENDER_RULE_1: String(settings.rule1),
    PHASE1_GENDER_RULE_2: String(settings.rule2),
    PHASE1_GENDER_RULE_3: String(settings.rule3)
  });
  return getPhase1GenderRules_();
}

/**
 * Comprueba un enfrentamiento 2 contra 2 aplicando solo las reglas activas.
 * Regla 1: una pareja de dos chicas solo se enfrenta a otra pareja de dos chicas.
 * Regla 2: si un equipo tiene alguna chica, el equipo rival también debe tenerla.
 * Regla 3: cada chica debe participar al menos en un partido GG contra GG.
 */
function isPhase1GenderMatchValid_(team1, team2, genderMap, rules) {
  const activeRules = rules || getPhase1GenderRules_();
  if (!activeRules.rule1 && !activeRules.rule2) return true;
  const hasGirl = team => team.some(name =>
    genderMap.get(normalizePlayerKey_(name)) === 'chica'
  );
  const isAllGirls = team => team.every(name =>
    genderMap.get(normalizePlayerKey_(name)) === 'chica'
  );
  // Regla 1: GG solo puede enfrentarse a GG.
  if (activeRules.rule1 && isAllGirls(team1) !== isAllGirls(team2)) return false;
  // Regla 2: ningún equipo con chicas puede enfrentarse a un equipo BB.
  if (activeRules.rule2 && hasGirl(team1) !== hasGirl(team2)) return false;
  return true;
}

/**
 * Valida todos los partidos de un calendario antes de guardarlo.
 * Se usa también como comprobación defensiva tras construir el calendario.
 */
function validatePhase1GenderSchedule_(matches, genderMap, rules) {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!isPhase1GenderMatchValid_(match[0], match[1], genderMap, rules)) {
      return {
        valid: false,
        matchNumber: i + 1,
        team1: match[0].slice(),
        team2: match[1].slice()
      };
    }
  }
  // Regla 3 es una condición del calendario completo y se comprueba abajo.
  if (rules && rules.rule3) {
    const girlsWithAllGirlMatch = new Set();
    matches.forEach(match => {
      const allGirlsMatch = match[0].every(name =>
        genderMap.get(normalizePlayerKey_(name)) === 'chica'
      ) && match[1].every(name =>
        genderMap.get(normalizePlayerKey_(name)) === 'chica'
      );
      if (allGirlsMatch) {
        match[0].concat(match[1]).forEach(name =>
          girlsWithAllGirlMatch.add(normalizePlayerKey_(name))
        );
      }
    });

    const girlsWithoutAllGirlMatch = [];
    genderMap.forEach((gender, key) => {
      if (gender === 'chica' && !girlsWithAllGirlMatch.has(key)) {
        girlsWithoutAllGirlMatch.push(key);
      }
    });
    if (girlsWithoutAllGirlMatch.length) {
      return {
        valid: false,
        reason: 'REGLA_3',
        players: girlsWithoutAllGirlMatch
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
