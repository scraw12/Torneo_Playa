# Tests

## Ejecutar localmente

Requiere Node.js 18 o posterior. Desde la raíz del repositorio:

```bash
npm test
```

## Alcance

`code-contract.test.js` ejecuta pruebas con el runner nativo de Node:
- Detecta declaraciones de funciones globales duplicadas entre archivos .gs.
- Comprueba que setup inicializa las cabeceras requeridas.
- Prueba el guardado público de resultados de Fase 1.
- Comprueba que no se puede guardar resultado de eliminatoria mientras hay un slot PENDIENTE.
- Comprueba guardado de eliminatoria, ganador y propagación.
- Comprueba que la asignación de PENDIENTE requiere permiso de administrador.
- Comprueba que la interfaz pública no muestra el editor de PENDIENTE.

Estas pruebas usan dobles/mocks de SpreadsheetApp y verifican contratos del código. No sustituyen una prueba dentro del runtime de Google Apps Script ni una prueba con una copia real del Google Sheet. La inicialización de setupTournament() y la persistencia real deben probarse también en el proyecto Apps Script de pruebas.
