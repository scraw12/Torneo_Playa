/**
 * TORNEO 2x2 VOLEY PLAYA - GOOGLE SHEETS + APPS SCRIPT
 * Modular version.
 *
 * Sheet names remain in Spanish for compatibility with the existing workbook.
 * Methods and variables are kept in English for maintainability.
 */

function shuffle(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function pairKey(a,b) {
  return [a,b].sort().join('¦');
}

function readScore(v) {
  if (v === '' || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function readSheetData(sheetName, width) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return { rows: [] };
  return { rows: sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues() };
}

function formatPublicDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Europe/Madrid', 'dd/MM/yyyy');
}
