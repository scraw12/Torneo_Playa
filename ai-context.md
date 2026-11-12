# AI Context — Torneo_Playa

Este documento sirve como contexto de trabajo para asistentes de IA que colaboren en el proyecto. Debe actualizarse cuando cambien las reglas, la arquitectura o el flujo de trabajo.

## Repositorio y flujo de ramas

- Repositorio: `scraw12/Torneo_Playa`.
- `main`: rama estable de producción. No se desarrolla directamente ni se actualiza sin autorización expresa del usuario.
- `dev`: rama de integración y pruebas generales. Es siempre el punto de partida para nuevos trabajos.
- `features`: rama temporal para implementar la funcionalidad en curso y sus pruebas unitarias. Se actualiza o recrea desde el `dev` vigente después de integrar el trabajo anterior, conservando primero cualquier trabajo sin terminar.
- Flujo: `dev` → `features` (desarrollo y pruebas unitarias) → `dev` (integración, pruebas de regresión y validación en Apps Script de pruebas) → `main` (solo con autorización expresa y posterior despliegue de producción).
- No sincronizar `features` ni `dev` directamente con Apps Script de producción.
- Antes de cualquier edición en GitHub, recuperar el contenido actual y el SHA de cada archivo que se vaya a modificar. Actualizar los archivos de forma secuencial usando el SHA más reciente.
- Mantener los cambios acotados a lo solicitado. No afirmar que se ha desplegado Apps Script ni que se ha probado contra la hoja real si no se ha hecho.
- Distinguir entre cambios en GitHub, sincronización del código con Apps Script y despliegue de la Web App: son pasos diferentes.
- La sincronización objetivo se realizará con `clasp` y/o GitHub Actions, manteniendo un proyecto Apps Script de pruebas separado del de producción.

Documentación: `README.md`, `docs/APP_OVERVIEW.md` y `docs/DEVELOPMENT_WORKFLOW.md`.
## Contexto funcional

Aplicación para organizar torneos mensuales de vóley playa 2 contra 2 mediante Google Sheets + Apps Script y una Web App. El número de participantes varía. La administración genera fases y registra resultados; la asignación de pistas se realiza manualmente.

Los nombres de funciones y variables deben estar en inglés. Los nombres de las hojas de cálculo se mantienen en español para no romper el libro existente. Los archivos `.gs` conviven en el mismo proyecto Apps Script.

## Fase 1: comportamiento esperado

- Todos los jugadores activos participan.
- Cada jugador debe disputar exactamente el número de partidos configurado.
- No se pueden repetir parejas de compañeros dentro de Fase 1.
- La generación no debe utilizar estadísticas históricas para decidir los emparejamientos.
- Las pistas se asignan manualmente.
- El calendario anterior solo debe reemplazarse después de construir y validar uno nuevo.
- Las reglas de género y BL afectan a Fase 1: generación y redistribución al incorporar jugadores. No se aplican a ORO/PLATA ni a eliminatorias.

## Reglas de género de Fase 1

Se configuran por separado desde Administración y se guardan en Script Properties:

- `PHASE1_GENDER_RULE_1`
- `PHASE1_GENDER_RULE_2`
- `PHASE1_GENDER_RULE_3`

Valores predeterminados cuando no existe propiedad:
- Regla 1: activada.
- Regla 2: desactivada.
- Regla 3: desactivada.

Semántica acordada:
1. **Regla 1:** un equipo formado por dos chicas (GG) solo puede enfrentarse a otro equipo GG. Los equipos que no sean GG pueden enfrentarse entre sí.
2. **Regla 2:** si un equipo contiene alguna chica, el equipo rival también debe contener al menos una chica. En consecuencia, un equipo de dos chicos no puede enfrentarse a un equipo que tenga chicas.
3. **Regla 3:** cada chica debe participar al menos en un partido GG contra GG (las cuatro personas del partido son chicas).

Los géneros se leen desde la columna `Genero` de `JUGADORES`; los valores admitidos son `Chico` y `Chica`. La columna se localiza por cabecera, no por posición fija. Si alguna regla de género está activa, cada jugador activo debe tener género válido. Esta información es solo de backend y no se debe exponer en los datos públicos de la Web App.

Funciones relevantes en `012_TournamentRules.gs`:
- `getPhase1GenderMap_(players)`
- `getPhase1GenderRules_()`
- `savePhase1GenderRules_(settings)`
- `isPhase1GenderMatchValid_(team1, team2, genderMap, rules)`
- `validatePhase1GenderSchedule_(matches, genderMap, rules)`

## Regla BL de Fase 1

La regla BL es independiente de las reglas de género y se puede activar/desactivar desde Administración. Está **activada por defecto**.

- Script Property: `PHASE1_BL_RULE`.
- Funciones de configuración: `getPhase1BLRule_()` y `savePhase1BLRule_(enabled)`.
- La marca de un jugador se almacena como `X` en la columna `BL` de `JUGADORES`.
- `ensurePhase1BLColumn_()` crea la columna al final de `JUGADORES` si todavía no existe.
- `getPhase1BLMap_(players)` devuelve el mapa de jugadores activos y su estado BL.

Reglas exactas acordadas:
1. Un jugador **sin BL** puede jugar como máximo un partido en el que su compañero tenga BL.
2. Independientemente de lo anterior, un jugador **sin BL** puede jugar como máximo un partido contra un equipo rival que contenga al menos un jugador BL.
3. Los dos contadores son independientes. Por ejemplo, un jugador sin BL puede tener un partido con compañero BL y otro partido distinto contra un equipo con BL.
4. Un jugador **con BL** no tiene restricciones BL propias y puede compartir equipo o enfrentarse a otros jugadores BL sin límite adicional derivado de esta regla.
5. Siguen vigentes las reglas normales de Fase 1, incluida la prohibición de repetir compañeros y el reparto exacto de partidos.
6. BL no debe mostrarse en la interfaz pública.

Validador: `validatePhase1BLSchedule_(matches, blMap)`. Devuelve `{valid: false, reason, player, matchNumber}` cuando encuentra una infracción; los motivos son `BL_COMPANERO` y `BL_RIVAL`.

## Incorporación de jugadores a Fase 1

La administración puede incorporar un jugador después de generar el calendario, siempre antes de que se haya introducido cualquier resultado. La operación intenta cambiar el mínimo de partidos existentes, añade los partidos necesarios y conserva el número configurado de partidos por jugador. Se recogen género y marca BL del nuevo jugador, se comprueban las reglas activas y se intenta revertir los cambios si falla la escritura del calendario.

Funciones principales en `010_Phase1PlayerManagement.gs`:
- `adminAddPhase1Player(playerData)`
- `findPhase1InsertionPlan_(...)`
- `findGenderValidNewPhase1Pairs_(...)`

La acción está protegida con `requireAdmin()`.

## Administración / Web App

- `007_Admin.gs` contiene las acciones protegidas del administrador.
- Las acciones de lectura y guardado de reglas son:
  - `adminGetPhase1GenderRules()`
  - `adminSavePhase1GenderRules(settings)`
  - `adminGetPhase1BLRule()`
  - `adminSavePhase1BLRule(enabled)`
- `index.html` contiene los controles para configurar las tres reglas de género, la regla BL y añadir jugadores a Fase 1.
- La configuración de reglas se carga al entrar en Administración y se guarda mediante llamadas a Apps Script.
- Todas las acciones administrativas del backend deben comprobar permisos con `requireAdmin()`.

## Estado del generador y limitación pendiente

En `002_Phase1.gs`, cuando hay exactamente 4 partidos por jugador y al menos 6 jugadores, se usa una construcción cíclica especial:
- Se baraja el orden de jugadores.
- Para cada índice se construye un partido con los jugadores de las posiciones `i`, `i+1`, `i+2` e `i+4` (índices cíclicos).
- Se prueban hasta 5.000 órdenes aleatorios.
- Se valida el calendario completo contra las reglas de género activas y, si está activada, contra la regla BL.
- Si no se encuentra solución, se lanza un error y el calendario anterior no se reemplaza.

**Limitación conocida:** este procedimiento solo explora una familia restringida de calendarios. Agotar 5.000 intentos no demuestra que no exista una solución matemática; puede significar que el algoritmo no ha encontrado una dentro de los órdenes probados.

Caso observado por el usuario: 29 jugadores, 4 partidos por jugador y 4 jugadores con BL marcado. La generación falla incluso al dejar activa únicamente la regla BL. La regla BL no debe relajarse para ocultar el problema. Queda pendiente mejorar la construcción del calendario para incorporar las restricciones BL durante la generación, conservando el reparto exacto y la prohibición de repetir compañeros. Esta mejora todavía **no está implementada**.

## Archivos relevantes

- `002_Phase1.gs`: generación de Fase 1.
- `007_Admin.gs`: autenticación y acciones de administración.
- `010_Phase1PlayerManagement.gs`: alta y redistribución de jugadores.
- `012_TournamentRules.gs`: reglas de género y BL.
- `index.html`: interfaz pública y administración.
- `001_Utils.gs`: utilidades comunes.
- `README.md`: resumen de uso, reglas y limitaciones.

## Precauciones para futuras modificaciones

1. Confirmar la rama de destino con el usuario. Actualmente ha indicado que primero integrará los cambios en `dev); esperar su confirmación antes de tocar esa rama.
2. Leer los archivos actuales y obtener sus SHA antes de editar.
3. No cambiar la semántica de las reglas de género o BL sin confirmación expresa.
4. No mostrar datos internos de género o BL en la Web App pública.
5. Probar los escenarios con reglas activadas y desactivadas, reparto exacto, compañeros no repetidos y alta de jugador antes de considerar una modificación terminada.
6. Distinguir siempre entre código actualizado en GitHub, código copiado al proyecto Apps Script y versión desplegada de la Web App: son pasos diferentes.
