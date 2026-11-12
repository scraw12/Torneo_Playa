# Torneo_Playa

Aplicación para organizar torneos de vóley playa 2 contra 2 mediante **Google Sheets, Google Apps Script y una Web App**. El número de participantes puede variar entre torneos.

La administración configura el torneo, genera los partidos, registra resultados y gestiona las fases. La asignación de pistas se realiza manualmente.
=======
## Flujo de ramas

El desarrollo se organiza en tres niveles:
- `dev`: rama estable de integración. Solo recibe cambios después de que hayan superado las pruebas y el usuario autorice la integración.
- `feature/phase1-bl-aware-generator`: rama de implementación. Aquí se desarrollan y corrigen las funcionalidades del generador BL-aware.
- `test/phase1-bl-aware-generator`: rama de pruebas. Parte de la rama `feature` y se utiliza para añadir pruebas automatizadas, ejecutar escenarios y corregir los problemas detectados durante la validación.

Flujo previsto: `dev` → `feature` → `test` → revisión de resultados → integración autorizada en `dev`. No se deben mezclar cambios de prueba sin revisar en `dev`. Mantener `dev` intacta mientras el generador no esté validado.

Las ramas `feature/phase1-bl-aware-generator` y `test/phase1-bl-aware-generator` se crearon desde `dev` y desde `feature`, respectivamente. La rama `test` parte del mismo estado de implementación que `feature` en el momento de su creación.

## Estructura y desarrollo

El torneo se organiza alrededor de estos bloques funcionales:

1. **Jugadores y configuración:** se gestionan los participantes y los parámetros del torneo.
2. **Fase 1:** participan todos los jugadores activos. El calendario debe repartir el mismo número de partidos por jugador, evitar repetir compañeros y respetar las reglas activas de género y BL. Los emparejamientos no utilizan estadísticas históricas.
3. **Clasificación:** se calcula a partir de los resultados. El criterio deportivo principal es el número de victorias y, después, la diferencia de puntos. Los desempates manuales se gestionan desde la clasificación.
4. **Grupos Oro y Plata:** los participantes se distribuyen en los grupos configurados a partir de la clasificación de Fase 1.
5. **Eliminatorias:** se generan los cruces de las fases finales y los ganadores avanzan hasta la final.
6. **Histórico:** se conservan estadísticas de torneos y jugadores para consultar la trayectoria de los participantes.

La administración utiliza la Web App para las operaciones protegidas. La interfaz pública permite consultar la información que la aplicación expone, sin mostrar datos internos de administración como las marcas BL o la información de género.

Para el detalle de reglas, módulos y comportamiento funcional, consulta [Visión general de la aplicación](docs/APP_OVERVIEW.md), el [esquema del libro](docs/DATABASE_SCHEMA.md) y la [revisión estática del código](docs/CODE_REVIEW.md).

## Flujo de ramas y desarrollo

El repositorio utiliza tres ramas principales:

| Rama | Responsabilidad |
|---|---|
| `main` | Producción. Contiene la versión estable publicada. |
| `dev` | Integración y pruebas generales. Es siempre el punto de partida del trabajo. |
| `features` | Rama temporal para desarrollar funcionalidades y sus pruebas unitarias. |

Flujo habitual:

1. Partir siempre de `dev`.
2. Desarrollar la funcionalidad y sus pruebas en `features`.
3. Integrar `features` en `dev` y ejecutar pruebas de integración y regresión.
4. Validar los cambios en el proyecto de Apps Script de pruebas.
5. Pasar `dev` a `main` únicamente con autorización expresa.
6. Publicar la versión estable y crear una etiqueta de versión, por ejemplo `v1.2.0`.

No se sincroniza `features` directamente con Apps Script de producción. No se modifica `main` durante el desarrollo ordinario.

El procedimiento detallado está en [Flujo de desarrollo y ramas](docs/DEVELOPMENT_WORKFLOW.md).

## Estructura técnica

- Los archivos `.gs` forman parte del mismo proyecto de Apps Script y pueden compartir funciones.
- `index.html` contiene la interfaz de la Web App.
- Los nombres de funciones y variables se mantienen en inglés.
- Los nombres de las hojas de cálculo se mantienen en español para conservar la compatibilidad con el libro existente.

Módulos principales:

| Archivo | Responsabilidad |
|---|---|
| `000_Core.gs` | Configuración y funciones centrales del torneo. |
| `001_Utils.gs` | Utilidades comunes. |
| `002_Phase1.gs` | Generación de partidos de Fase 1. |
| `003_Standings.gs` | Clasificación y resultados. |
| `004_FinalStage.gs` | Configuración de la fase Oro/Plata. |
| `005_Knockouts.gs` | Generación y gestión de eliminatorias. |
| `006_History.gs` | Estadísticas e histórico. |
| `007_Admin.gs` | Autenticación y acciones administrativas. |
| `008_WebApp.gs` | Entrada y servicios de la Web App. |
| `009_KnockoutManagement.gs` | Gestión de participantes/cruces de eliminatorias. |
| `010_Phase1PlayerManagement.gs` | Incorporación y redistribución de jugadores en Fase 1. |
| `012_TournamentRules.gs` | Reglas de género y BL de Fase 1. |
| `index.html` | Interfaz pública y de administración. |

## Fase 1: reglas de género y BL

Las reglas se configuran por separado desde Administración y afectan a la generación de Fase 1 y a la redistribución al incorporar jugadores.

### Reglas de género

1. **Regla 1 (activada por defecto):** una pareja formada por dos chicas solo puede enfrentarse a otra pareja formada por dos chicas.
2. **Regla 2 (desactivada por defecto):** si un equipo tiene alguna chica, el equipo rival también debe tener al menos una chica.
3. **Regla 3 (desactivada por defecto):** cada chica debe participar al menos en un partido en el que los cuatro participantes sean chicas.

El género se lee de la columna `Genero` de `JUGADORES`; los valores admitidos son `Chico` y `Chica`. Si alguna regla está activa, todos los jugadores activos deben tener un valor válido. Esta información no debe exponerse en los datos públicos.

### Regla BL

La regla BL es independiente de las reglas de género y está **activada por defecto**.

- La marca se guarda como `X` en la columna `BL` de `JUGADORES`. Si no existe, el código la crea.
- Un jugador sin BL puede jugar como máximo un partido con un compañero BL.
- Independientemente, un jugador sin BL puede jugar como máximo un partido contra un equipo que contenga algún jugador BL.
- Ambos límites son independientes.
- Los jugadores con BL no tienen restricciones BL propias.
- La marca BL es información interna y no debe mostrarse en la interfaz pública.

## Administración y seguridad

- La vista pública se mantiene disponible sin inicio de sesión.
- La ruta de administración se abre con `?admin=1` y solicita usuario y contraseña.
- Las cuentas se crean individualmente desde el editor de la hoja: primero ejecuta `configureAdministrator()` una vez desde el editor de Apps Script con la cuenta propietaria; después utiliza el menú **🏐 TORNEO → Usuarios de administración**.
- Cada cuenta requiere un usuario único y una contraseña de al menos 12 caracteres. Las contraseñas no se guardan en texto plano: se almacena un hash PBKDF2-HMAC-SHA256 con sal individual.
- Las sesiones se guardan en caché del servidor, duran hasta 6 horas de inactividad y se pueden cerrar desde la Web App. Se limita el acceso tras cinco intentos fallidos durante 15 minutos.
- Desde el gestor del propietario se pueden crear y eliminar cuentas. Al eliminar una cuenta, sus sesiones dejan de ser válidas en la siguiente petición.
- Las acciones administrativas web reciben un token de sesión y validan `requireAdmin(sessionToken)`. Las funciones internas del torneo terminan en guion bajo y no se exponen a `google.script.run`.
- Las funciones de menú de la hoja requieren la cuenta propietaria configurada. La edición pública de resultados individuales y múltiples se conserva como funcionalidad pública actual.
- Las reglas de género y BL se guardan en las propiedades del proyecto de Apps Script.

**Puesta en marcha de la autenticación:** ejecuta `configureAdministrator()` desde el editor una sola vez, crea los usuarios desde el menú y vuelve a desplegar la Web App para que use el código actualizado. No compartas las contraseñas por el propio repositorio.

## Limitaciones conocidas

La generación de Fase 1 para 4 partidos por jugador utiliza en esta versión una construcción cíclica que prueba hasta 5.000 órdenes aleatorios. Si no encuentra una combinación válida, muestra un error. Esto no demuestra que no exista una solución matemática: el algoritmo explora una familia limitada de calendarios.

Se ha observado un fallo con 29 jugadores, 4 partidos por jugador y 4 jugadores BL, incluso dejando activa únicamente la regla BL. La regla no debe relajarse para ocultar el problema. La mejora del algoritmo debe considerarse pendiente hasta que esté implementada y probada.


## Sincronización y despliegue

El código de GitHub, el código del proyecto de Apps Script y la versión desplegada de la Web App son estados distintos. Actualizar una rama de GitHub no despliega automáticamente la aplicación.

La sincronización prevista se realizará con `clasp` y/o GitHub Actions, separando el proyecto de Apps Script de pruebas del de producción. No se debe publicar en producción desde `features` ni desde `dev` sin la aprobación correspondiente.
## Generación de Fase 1 con reglas BL

La generación admite entre **3 y 5 partidos por jugador** y cualquier cantidad de jugadores marcados con BL. Cuando la regla BL está activada, `002_Phase1.gs` utiliza el solucionador general `generatePhase1ConstraintAware_()` de `013_Phase1BLGenerator.gs`.

El algoritmo construye el calendario comprobando en cada partido:
- Reparto de apariciones pendientes, hasta alcanzar exactamente el número configurado para cada jugador.
- Ninguna pareja de compañeros repetida.
- Para cada jugador sin BL, como máximo un partido con compañero BL.
- Para cada jugador sin BL, como máximo un partido contra un equipo que contenga BL. Este contador es independiente del anterior.
- Reglas de género activas; la regla de género 3 se valida sobre el calendario completo.

El generador utiliza búsqueda con retroceso y límites de tiempo/nodos para evitar ejecuciones indefinidas. Si agota esos límites sin encontrar calendario, informa del fallo y conserva el calendario anterior. Por tanto, un fallo de búsqueda no demuestra por sí solo que el calendario sea matemáticamente imposible. La implementación debe probarse con diferentes tamaños de torneo, cantidades BL y configuraciones de género antes de considerarse validada.

## Contexto para asistentes de IA

`ai-context.md` recoge decisiones funcionales, restricciones técnicas y precauciones que deben respetarse al continuar el desarrollo.
=======
Los cambios de código deben copiarse/sincronizarse con el proyecto de Apps Script y después desplegarse de nuevo como Web App para probarlos. Los cambios documentados en la rama de desarrollo no implican que estén ya desplegados ni validados en la hoja real.


## Pruebas automatizadas de Fase 1

En la rama `test/phase1-bl-aware-generator` está el archivo `014_Phase1BLGeneratorTests.gs`. Copia ese archivo junto con los archivos de producción `001_Utils.gs`, `012_TournamentRules.gs` y `013_Phase1BLGenerator.gs` en un proyecto de prueba de Apps Script.

Desde el editor de Apps Script ejecuta:

- `runPhase1BLGeneratorTests()`: pruebas de validadores BL, independencia de contadores, exención de jugadores BL, reglas de género y generación con 3, 4 y 5 partidos por jugador.
- `runPhase1BLGeneratorStressTests()`: escenario ampliado de 29 jugadores, 4 partidos por jugador y 4 jugadores BL.

Las pruebas utilizan datos sintéticos en memoria. No leen ni modifican hojas, propiedades del proyecto ni calendarios reales. Los resultados se muestran en el registro de ejecución; si falla una prueba, la función lanza una excepción al terminar para que el fallo sea visible.

La búsqueda del generador tiene límites de tiempo y nodos. Por ello, un fallo en una prueba de generación significa que no se encontró solución dentro de esos límites; no demuestra por sí solo que el escenario sea matemáticamente imposible. Repetir una prueba puede dar resultados distintos porque el generador utiliza aleatoriedad.

