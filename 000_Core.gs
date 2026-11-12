/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

const SHEETS = {
  PANEL: 'PANEL',
  CONFIG: 'CONFIG',
  PLAYERS: 'JUGADORES',
  PHASE1: 'FASE1',
  STANDINGS: 'CLASIFICACION',
  FINAL_PAIRS: 'ORO_PLATA',
  KNOCKOUT: 'ELIMINATORIAS',
  PLAYER_HISTORY: 'HIST_JUGADORES',
  TOURNAMENT_HISTORY: 'HIST_TORNEOS'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏐 TORNEO')
    .addItem('⚙️ Preparar / actualizar estructura', 'setupTournament')
    .addSeparator()
    .addItem('🎲 Generar Fase 1', 'generatePhase1')
    .addItem('📊 Actualizar clasificación', 'updateStandings')
    .addItem('🏆 Generar Oro / Plata', 'generateGoldSilver')
    .addItem('⚔️ Generar eliminatorias', 'generateKnockout')
    .addSeparator()
    .addItem('💾 Finalizar tournament y actualizar histórico', 'finishTournament')
    .addItem('🧹 Nuevo tournament', 'newTournament')
    .addToUi();
}

function setupTournament() {
  const ss = SpreadsheetApp.getActive();
  const defs = {
    PANEL: [['PANEL DE CONTROL',''],['Acción','Activar'],['Generar Fase 1',''],['Actualizar clasificación',''],['Generar Oro / Plata',''],['Generar eliminatorias',''],['Finalizar tournament',''],['Nuevo tournament','']],
    CONFIG: [
      ['CONFIGURACIÓN','Valor'],
      ['Nombre del tournament','Torneo mensual'],
      ['Fecha',new Date()],
      ['Partidos por player',3],
      ['Número de courts',2],
      ['Máx. diferencia de posiciones en pair final',3],
      ['Mínimo de matches',3],
      ['Jugadores en ORO',0]
    ],
    JUGADORES: [['Jugador','Activo','Partidos','Genero','BL'],['Alejandro',true,0,'Chico',''],['Marta',true,0,'Chica',''],['Laura',true,0,'Chica',''],['Sergio',true,0,'Chico','']],
    FASE1: [['Partido','Pista','Ronda','Jugador 1','Jugador 2', 'VS','Jugador 3','Jugador 4','Puntos team 1','Puntos team 2']],
    CLASIFICACION: [['Pos.','Jugador','PJ','V','D','PF','PC','Dif.','% Vict.','Desempate manual','Aviso']],
    ORO_PLATA: [['Competición','Pos.','Jugador','Pareja','ID Pareja']],
    ELIMINATORIAS: [['Competición','Ronda','Partido','Pareja 1','Pareja 2','Puntos 1','Puntos 2','Ganador']],
    HIST_JUGADORES: [['Jugador','Torneos','PJ','V','D','PF','PC','Dif.','% Vict.','Oro campeón','Oro subcampeón','Plata campeón','Plata subcampeón']],
    HIST_TORNEOS: [['Fecha','Torneo','Jugador','PJ','V','D','PF','PC','Dif.','% Vict.','Competición final','Resultado final']]
  };

  Object.keys(defs).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const data = defs[name];
    // Inicializa solo hojas vacías. No borra participantes, configuración ni históricos
    // si se vuelve a ejecutar setupTournament().
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, data.length, data[0].length).setValues(data);
    } else if (name === SHEETS.CONFIG && sh.getLastRow() < 8) {
      sh.getRange(8,1,1,2).setValues([['Jugadores en ORO',0]]);
    } else if (name === SHEETS.PANEL) {
      // Corrige la cabecera antigua de una sola columna sin tocar el resto del panel.
      sh.getRange(1, 1, 1, 2).setValues([['PANEL DE CONTROL', '']]);
    }

    sh.setFrozenRows(1);
    const width = data[0].length;
    sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#d9ead3');
    sh.autoResizeColumns(1, width);
  });

  // Complete legacy sheets without moving or overwriting existing player data.
  ensureRequiredHeaders_(ss.getSheetByName(SHEETS.PLAYERS), [
    'Jugador', 'Activo', 'Partidos', 'Genero', 'BL'
  ]);
  ensureRequiredHeaders_(ss.getSheetByName(SHEETS.STANDINGS), [
    'Pos.', 'Jugador', 'PJ', 'V', 'D', 'PF', 'PC', 'Dif.', '% Vict.',
    'Desempate manual', 'Aviso'
  ]);

  const panel = ss.getSheetByName(SHEETS.PANEL);
  panel.getRange('B3:B8').insertCheckboxes();
  panel.getRange('A10').setValue('Usa los checkboxes o el menú 🏐 TORNEO. Los results se introducen directamente en FASE1 y ELIMINATORIAS.');
  if (!panel.getRange('A10:H10').isPartOfMerge()) panel.getRange('A10:H10').merge();
  panel.getRange('A10').setWrap(true);
  panel.setColumnWidth(1, 240);
  panel.setColumnWidth(2, 100);
  ss.getSheetByName(SHEETS.CONFIG).getRange('B3').setNumberFormat('dd/mm/yyyy');
  SpreadsheetApp.getUi().alert('Estructura comprobada. Se han conservado los data existentes y el histórico.');
}

/**
 * Adds missing required headers at the end of a sheet without overwriting
 * existing headers or row data. Existing column positions are preserved.
 */
function ensureRequiredHeaders_(sheet, requiredHeaders) {
  if (!sheet) throw new Error('No se encuentra la hoja para comprobar sus cabeceras.');
  const added = [];
  requiredHeaders.forEach((header, index) => {
    const targetColumn = index + 1;
    const lastColumn = Math.max(targetColumn, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      .map(value => String(value || '').trim());
    if (headers[targetColumn - 1] === header) return;
    if (headers.includes(header)) return;
    // Insert rather than overwrite: legacy columns and their data move intact.
    sheet.insertColumnBefore(targetColumn);
    sheet.getRange(1, targetColumn).setValue(header);
    added.push(header);
  });
  return added;
}

function getConfig() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.CONFIG);

  // B7 define el mínimo configurable y B4 el objetivo de matches por player.
  // Si el objetivo queda por debajo del mínimo, se usa el mínimo configurado.
  const minimumMatches = Math.max(1, Number(sh.getRange('B7').getValue()) || 3);
  const configuredMatches = Number(sh.getRange('B4').getValue());
  const matchesPerPlayer = Math.max(
    minimumMatches,
    Number.isFinite(configuredMatches) && configuredMatches > 0
      ? configuredMatches
      : minimumMatches
  );

  return {
    name: sh.getRange('B2').getValue() || 'Torneo mensual',
    date: sh.getRange('B3').getValue() || new Date(),
    matchesPerPlayer: matchesPerPlayer,
    minimumMatches: minimumMatches,
    courts: Math.max(1, Number(sh.getRange('B5').getValue()) || 1),
    maxRankGap: Math.max(1, Number(sh.getRange('B6').getValue()) || 3),
    goldPlayers: Math.max(0, Math.floor(Number(sh.getRange('B8').getValue()) || 0))
  };
}

function getPlayers() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.PLAYERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2,1,last-1,2).getValues();
  return rows.filter(r => r[0] && (r[1] === true || r[1] === '' || String(r[1]).toLowerCase() === 'true'))
    .map(r => String(r[0]).trim());
}
