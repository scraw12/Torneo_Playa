# Torneo_Playa

Aplicación de gestión de torneos de vóley playa 2 contra 2, construida con Google Sheets y Google Apps Script. Incluye una Web App con vistas públicas y una zona de administración protegida.

## Flujo de ramas

El desarrollo se organiza en tres niveles:
- `dev`: rama estable de integración. Solo recibe cambios después de que hayan superado las pruebas y el usuario autorice la integración.
- `feature/phase1-bl-aware-generator`: rama de implementación. Aquí se desarrollan y corrigen las funcionalidades del generador BL-aware.
- `test/phase1-bl-aware-generator`: rama de pruebas. Parte de la rama `feature` y se utiliza para añadir pruebas automatizadas, ejecutar escenarios y corregir los problemas detectados durante la validación.

Flujo previsto: `dev` → `feature` → `test` → revisión de resultados → integración autorizada en `dev`. No se deben mezclar cambios de prueba sin revisar en `dev`. Mantener `dev` intacta mientras el generador no esté validado.

Las ramas `feature/phase1-bl-aware-generator` y `test/phase1-bl-aware-generator` se crearon desde `dev` y desde `feature`, respectivamente. La rama `test` parte del mismo estado de implementación que `feature` en el momento de su creación.

## Estructura y desarrollo

- El proyecto de Apps Script está dividido en varios archivos `.gs` que se ejecutan dentro del mismo proyecto y comparten sus funciones.
- `001_Utils.gs`: utilidades comunes.
- `002_Phase1.gs`: generación de partidos de Fase 1.
- `007_Admin.gs`: autenticación de administración y acciones protegidas de la Web App.
- `010_Phase1PlayerManagement.gs`: incorporación de jugadores y redistribución de partidos de Fase 1.
- `012_TournamentRules.gs`: reglas de género y BL de Fase 1.
- `index.html`: interfaz de la Web App, incluidas las opciones de administración.
- Los nombres de las hojas de cálculo se mantienen en español para conservar la compatibilidad con el libro existente. Los nombres de funciones y variables se mantienen en inglés.

Mantén todos los archivos `.gs` dentro del mismo proyecto de Apps Script: sus funciones pueden llamarse entre sí.

## Fase 1

La generación debe mantener el mismo número de partidos por jugador, no repetir parejas de compañeros y respetar las reglas configuradas en Administración.

### Reglas de género

Las tres reglas son independientes y se aplican únicamente a Fase 1, tanto al generar el calendario como al incorporar un jugador:

1. **Regla 1 (activada por defecto):** una pareja formada por dos chicas solo puede enfrentarse a otra pareja formada por dos chicas.
2. **Regla 2 (desactivada por defecto):** si un equipo tiene alguna chica, el equipo rival también debe tener al menos una chica. Por tanto, un equipo de dos chicos no puede enfrentarse a un equipo con chicas.
3. **Regla 3 (desactivada por defecto):** cada chica debe participar al menos en un partido en el que los cuatro participantes sean chicas.

Los datos de género se leen de la columna `Genero` de `JUGADORES`. Los valores admitidos son `Chico` y `Chica`. Si hay alguna regla de género activa, todos los jugadores activos deben tener un valor válido. El género se utiliza en el backend y no debe exponerse en los datos públicos de la Web App.

### Regla BL

La regla BL de Fase 1 es independiente de las reglas de género y está **activada por defecto**. Se puede activar o desactivar desde Administración.

- La marca de cada jugador se guarda como `X` en la columna `BL` de `JUGADORES`.
- Si la columna no existe, el código la crea al final de la hoja.
- Un jugador **sin BL** puede jugar como máximo un partido con un compañero que tenga BL.
- Un jugador **sin BL** puede jugar como máximo un partido contra un equipo que tenga al menos un jugador BL.
- Son dos límites independientes: consumir el límite como compañero no consume el límite como rival, ni al contrario.
- Los jugadores **con BL** no tienen estos límites BL.
- Se mantienen las restricciones normales de Fase 1: no repetir compañeros y conservar el reparto de partidos.
- La marca BL es información interna de administración y no debe mostrarse en la interfaz pública.

La regla se aplica tanto al generar Fase 1 como al incorporar jugadores y redistribuir los partidos.

### Incorporar un jugador a Fase 1

La administración puede añadir un participante después de generar el calendario, siempre que todavía no se haya introducido ningún resultado. La operación intenta modificar el menor número posible de partidos existentes y añade los partidos necesarios para mantener el mismo número de encuentros por jugador. Al incorporar a la persona se pueden indicar su género y su marca BL; se validan las reglas activas antes de guardar la redistribución.

## Administración y seguridad

- La configuración de las reglas de género y BL se guarda en las propiedades del proyecto de Apps Script.
- Las acciones administrativas del backend deben comprobar los permisos mediante `requireAdmin()`.
- Ejecuta `configureAdministrator()` desde el editor de Apps Script con la cuenta que deba ser administradora.
- La configuración BL no sustituye las reglas de género: ambas se evalúan por separado cuando están activadas.

## Generación de Fase 1 con reglas BL

La generación admite entre **3 y 5 partidos por jugador** y cualquier cantidad de jugadores marcados con BL. Cuando la regla BL está activada, `002_Phase1.gs` utiliza el solucionador general `generatePhase1ConstraintAware_()` de `013_Phase1BLGenerator.gs`.

El algoritmo construye el calendario comprobando en cada partido:
- Reparto de apariciones pendientes, hasta alcanzar exactamente el número configurado para cada jugador.
- Ninguna pareja de compañeros repetida.
- Para cada jugador sin BL, como máximo un partido con compañero BL.
- Para cada jugador sin BL, como máximo un partido contra un equipo que contenga BL. Este contador es independiente del anterior.
- Reglas de género activas; la regla de género 3 se valida sobre el calendario completo.

El generador utiliza búsqueda con retroceso y límites de tiempo/nodos para evitar ejecuciones indefinidas. Si agota esos límites sin encontrar calendario, informa del fallo y conserva el calendario anterior. Por tanto, un fallo de búsqueda no demuestra por sí solo que el calendario sea matemáticamente imposible. La implementación debe probarse con diferentes tamaños de torneo, cantidades BL y configuraciones de género antes de considerarse validada.

## Despliegue y pruebas

Los cambios de código deben copiarse/sincronizarse con el proyecto de Apps Script y después desplegarse de nuevo como Web App para probarlos. Los cambios documentados en la rama de desarrollo no implican que estén ya desplegados ni validados en la hoja real.


## Pruebas automatizadas de Fase 1

En la rama `test/phase1-bl-aware-generator` está el archivo `014_Phase1BLGeneratorTests.gs`. Copia ese archivo junto con los archivos de producción `001_Utils.gs`, `012_TournamentRules.gs` y `013_Phase1BLGenerator.gs` en un proyecto de prueba de Apps Script.

Desde el editor de Apps Script ejecuta:

- `runPhase1BLGeneratorTests()`: pruebas de validadores BL, independencia de contadores, exención de jugadores BL, reglas de género y generación con 3, 4 y 5 partidos por jugador.
- `runPhase1BLGeneratorStressTests()`: escenario ampliado de 29 jugadores, 4 partidos por jugador y 4 jugadores BL.

Las pruebas utilizan datos sintéticos en memoria. No leen ni modifican hojas, propiedades del proyecto ni calendarios reales. Los resultados se muestran en el registro de ejecución; si falla una prueba, la función lanza una excepción al terminar para que el fallo sea visible.

La búsqueda del generador tiene límites de tiempo y nodos. Por ello, un fallo en una prueba de generación significa que no se encontró solución dentro de esos límites; no demuestra por sí solo que el escenario sea matemáticamente imposible. Repetir una prueba puede dar resultados distintos porque el generador utiliza aleatoriedad.
