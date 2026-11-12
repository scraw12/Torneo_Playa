# Torneo_Playa

Aplicación de gestión de torneos de vóley playa 2 contra 2, construida con Google Sheets y Google Apps Script. Incluye una Web App con vistas públicas y una zona de administración protegida.

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

## Limitaciones conocidas / trabajo pendiente

Para la configuración de **4 partidos por jugador**, se mantiene la construcción cíclica existente salvo en el caso de 28 o más jugadores y exactamente 4 jugadores con BL. En ese escenario se utiliza `013_Phase1BLGenerator.gs`: primero construye una estructura de diez partidos que distribuye las apariciones BL (cada jugador BL comparte equipo una vez con cada uno de los otros tres jugadores BL y una vez con un jugador sin BL), y después intenta completar las apariciones restantes exclusivamente entre jugadores sin BL.

El generador nuevo respeta los dos contadores BL independientes, evita repetir compañeros y comprueba las reglas de género antes de aceptar el calendario. Si no encuentra solución dentro de sus límites de búsqueda, devuelve un error y conserva el calendario anterior. Esta implementación está pendiente de pruebas en Apps Script y con los datos reales del torneo; no se considera validada hasta completar esas pruebas.

## Despliegue y pruebas

Los cambios de código deben copiarse/sincronizarse con el proyecto de Apps Script y después desplegarse de nuevo como Web App para probarlos. Los cambios documentados en la rama de desarrollo no implican que estén ya desplegados ni validados en la hoja real.
