const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceFiles = fs.readdirSync(root).filter(name => name.endsWith('.gs'));
const source = Object.fromEntries(sourceFiles.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));

function makeSheet(rows) {
  return {
    rows: rows.map(row => row.slice()),
    getLastRow() { return this.rows.length; },
    getRange(row, col, height, width) {
      const sheet = this;
      return {
        getValues() {
          return sheet.rows.slice(row - 1, row - 1 + height)
            .map(line => line.slice(col - 1, col - 1 + width));
        },
        setValues(values) {
          values.forEach((line, i) => line.forEach((value, j) => {
            sheet.rows[row - 1 + i][col - 1 + j] = value;
          }));
        },
        setValue(value) { sheet.rows[row - 1][col - 1] = value; }
      };
    }
  };
}

function loadWebApp({ phase1Rows = [], knockoutRows = [], admin = false } = {}) {
  const sheets = {
    FASE1: makeSheet([[], ...phase1Rows]),
    ELIMINATORIAS: makeSheet([[], ...knockoutRows])
  };
  const context = {
    SHEETS: { PHASE1: 'FASE1', KNOCKOUT: 'ELIMINATORIAS' },
    SpreadsheetApp: { getActive: () => ({ getSheetByName: name => sheets[name] || null }), flush() {} },
    updateStandings() { context.standingsUpdated = true; },
    propagateKnockoutWinner_(id, winner) { context.propagated = [id, winner]; },
    getPublicTournamentData() { return { refreshed: true }; },
    requireAdmin() { if (!admin) throw new Error('ADMIN_REQUIRED'); },
    Number, String, Set, Map, Math, Object, Array, JSON, Date
  };
  vm.createContext(context);
  vm.runInContext(source['008_WebApp.gs'], context);
  return { context, sheets };
}

test('no duplicate global function declarations across Apps Script files', () => {
  const declarations = new Map();
  for (const [file, content] of Object.entries(source)) {
    for (const match of content.matchAll(/^function\s+([\w$]+)\s*\(/gm)) {
      const name = match[1];
      declarations.set(name, [...(declarations.get(name) || []), file]);
    }
  }
  const duplicates = [...declarations].filter(([, files]) => files.length > 1);
  assert.deepEqual(duplicates, []);
});

test('setup initializes all required player and standings headers', () => {
  const core = source['000_Core.gs'];
  assert.match(core, /JUGADORES:\s*\[\['Jugador','Activo','Partidos','Genero','BL'\]/);
  assert.match(core, /'Desempate manual',\s*'Aviso'/);
  assert.match(core, /ensureRequiredHeaders_\(ss\.getSheetByName\(SHEETS\.PLAYERS\)/);
  assert.match(core, /ensureRequiredHeaders_\(ss\.getSheetByName\(SHEETS\.STANDINGS\)/);
});

test('public FASE1 score can be saved and refreshes standings', () => {
  const { context, sheets } = loadWebApp({ phase1Rows: [[1, '', 1, 'A', 'B', 'VS', 'C', 'D', '', '']] });
  const result = context.savePublicResult('FASE1', '1', 21, 18);
  assert.deepEqual(sheets.FASE1.rows[1].slice(8, 10), [21, 18]);
  assert.equal(context.standingsUpdated, true);
  assert.equal(result.ok, true);
});

test('public knockout score is rejected while a pair is PENDIENTE', () => {
  const { context, sheets } = loadWebApp({ knockoutRows: [['ORO', 'Previa', 'ORO-R1-1', 'A / PENDIENTE', 'B / C', '', '', '']] });
  assert.throws(() => context.savePublicResult('KO', 'ORO-R1-1', 21, 12), /PENDIENTE/);
  assert.equal(sheets.ELIMINATORIAS.rows[1][5], '');
});

test('public knockout score saves winner and propagates it', () => {
  const { context, sheets } = loadWebApp({ knockoutRows: [['ORO', 'Previa', 'ORO-R1-1', 'A / B', 'C / D', '', '', '']] });
  context.savePublicResult('KO', 'ORO-R1-1', 21, 14);
  assert.deepEqual(sheets.ELIMINATORIAS.rows[1].slice(5, 8), [21, 14, 'A / B']);
  assert.deepEqual(context.propagated, ['ORO-R1-1', 'A / B']);
});

test('assigning a PENDIENTE slot requires administrator permission', () => {
  const { context } = loadWebApp({ knockoutRows: [['ORO', 'Previa', 'ORO-R1-1', 'A / PENDIENTE', 'C / D', '', '', '']] });
  assert.throws(() => context.savePendingPlayer('ORO-R1-1', 1, 'Jugador X'), /ADMIN_REQUIRED/);
});

test('public web interface does not render the PENDIENTE editor', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /if \(!window\.IS_ADMIN\) return esc\(pair\);/);
});

test('public batch score saving updates multiple FASE1 matches', () => {
  const { context, sheets } = loadWebApp({
    phase1Rows: [
      [1, '', 1, 'A', 'B', 'VS', 'C', 'D', '', ''],
      [2, '', 1, 'E', 'F', 'VS', 'G', 'H', '', '']
    ]
  });
  const result = context.savePublicScoreMultiple('FASE1', [
    { id: '1', score1: 21, score2: 16 },
    { id: '2', score1: 18, score2: 21 }
  ]);
  assert.equal(result.savedCount, 2);
  assert.deepEqual(sheets.FASE1.rows.slice(1).map(row => row.slice(8, 10)), [[21, 16], [18, 21]]);
  assert.equal(context.standingsUpdated, true);
});

test('batch knockout result rejects any PENDIENTE match before writing batch', () => {
  const { context, sheets } = loadWebApp({
    knockoutRows: [
      ['ORO', 'Previa', 'ORO-R1-1', 'A / B', 'C / D', '', '', ''],
      ['ORO', 'Previa', 'ORO-R1-2', 'E / PENDIENTE', 'G / H', '', '', '']
    ]
  });
  assert.throws(() => context.savePublicScoreMultiple('KO', [
    { id: 'ORO-R1-1', score1: 21, score2: 10 },
    { id: 'ORO-R1-2', score1: 21, score2: 19 }
  ]), /PENDIENTE/);
  assert.equal(sheets.ELIMINATORIAS.rows[1][5], '');
});
