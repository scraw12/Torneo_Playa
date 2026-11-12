# Tests por módulo

Esta carpeta agrupa las pruebas por archivo/módulo de producción. Convención: `NNN_NombreModulo.test.gs`.

## Ejecución

Ejecuta `runAllModuleTests()` para lanzar las pruebas disponibles. También puedes ejecutar cada función `testNNN...` por separado desde Apps Script.

Las pruebas actuales son unitarias y usan datos en memoria. No modifican hojas ni propiedades. Las funciones que dependen directamente de SpreadsheetApp/HtmlService/servicios de Google requieren una futura capa de integración con hojas de prueba; no se deben ejecutar contra el torneo real.

## Cobertura inicial

- `000_Core.test.gs`: utilidades de configuración y lectura, pendiente de mocks de SpreadsheetApp.
- `001_Utils.test.gs`: claves de parejas, lectura de marcadores y formato básico.
- `003_Standings.test.gs`: posiciones manuales y comparación deportiva.
- `005_Knockouts.test.gs`: parsing de nombres de equipos.
- `012_TournamentRules.test.gs`: normalización de nombres/género y reglas.
- `013_Phase1BLGenerator.test.gs`: generador y restricciones BL.

La cobertura se ampliará módulo a módulo. No se considera que un módulo esté validado solo por tener un archivo de tests: deben existir casos que ejerciten sus funciones y ejecutarse correctamente.
