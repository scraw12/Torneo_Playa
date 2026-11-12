# Tests por módulo

Las pruebas se organizan por archivo/módulo de producción con la convención `NNN_NombreModulo.test.gs`.

## Ejecución

Ejecuta `runAllModuleTests()` desde el editor de Apps Script para lanzar las suites registradas. También puedes ejecutar cada suite individualmente.

Las pruebas unitarias actuales usan datos en memoria. Las suites marcadas como `SKIPPED` son esqueletos intencionados: identifican módulos que necesitan una fixture aislada de Google Sheets, permisos o Web App antes de probar operaciones con efectos secundarios. No se debe ejecutar una prueba de integración contra el torneo real.

## Estado de cobertura inicial

| Módulo | Archivo de test | Estado |
|---|---|---|
| 000 Core | `000_Core.test.gs` | Pendiente: fixture SpreadsheetApp |
| 001 Utils | `001_Utils.test.gs` | Unit tests |
| 002 Phase 1 | `002_Phase1.test.gs` | Pendiente: fixture de hojas |
| 003 Standings | `003_Standings.test.gs` | Unit tests |
| 004 Final Stage | `004_FinalStage.test.gs` | Unit tests |
| 005 Knockouts | `005_Knockouts.test.gs` | Pendiente: fixture de cuadro |
| 006 History | `006_History.test.gs` | Pendiente: fixture multihoja |
| 007 Admin | `007_Admin.test.gs` | Pendiente: mocks de permisos |
| 008 Web App | `008_WebApp.test.gs` | Pendiente: integración |
| 009 Knockout Management | `009_KnockoutManagement.test.gs` | Unit tests |
| 010 Phase 1 Player Management | `010_Phase1PlayerManagement.test.gs` | Pendiente: fixture de redistribución |
| 012 Tournament Rules | `012_TournamentRules.test.gs` | Unit tests |
| 013 Phase 1 BL Generator | `013_Phase1BLGenerator.test.gs` | Unit tests y generación sintética |

El módulo 011 no aparece en el proyecto actual. Si se añade, se creará su suite correspondiente.

## Pruebas de estrés

`runPhase1BLGeneratorStressTests()` ejecuta el escenario de 29 jugadores, 4 partidos por jugador y 4 BL. Debe lanzarse por separado de la batería normal.

## Criterio de validación

Tener un archivo de test no significa que el módulo esté validado. Una suite solo cuenta como cubierta cuando tiene casos reales, se ejecuta y pasa. Las funciones que escriben datos deben probarse con fixtures aisladas y verificar también que los errores no dejan cambios parciales.
