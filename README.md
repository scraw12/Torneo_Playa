# Torneo_Playa

Aplicación para organizar torneos de vóley playa 2 contra 2 mediante **Google Sheets, Google Apps Script y una Web App**. El número de participantes puede variar entre torneos.

La administración configura el torneo, genera los partidos, registra resultados y gestiona las fases. La asignación de pistas se realiza manualmente.

## Cómo funciona la aplicación

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

- Las reglas de género y BL se guardan en las propiedades del proyecto de Apps Script.
- Las acciones administrativas del backend deben comprobar permisos mediante `requireAdmin()`.
- Ejecuta `configureAdministrator()` desde el editor de Apps Script con la cuenta que deba ser administradora.

## Limitaciones conocidas

La generación de Fase 1 para 4 partidos por jugador utiliza en esta versión una construcción cíclica que prueba hasta 5.000 órdenes aleatorios. Si no encuentra una combinación válida, muestra un error. Esto no demuestra que no exista una solución matemática: el algoritmo explora una familia limitada de calendarios.

Se ha observado un fallo con 29 jugadores, 4 partidos por jugador y 4 jugadores BL, incluso dejando activa únicamente la regla BL. La regla no debe relajarse para ocultar el problema. La mejora del algoritmo debe considerarse pendiente hasta que esté implementada y probada.

## Sincronización y despliegue

El código de GitHub, el código del proyecto de Apps Script y la versión desplegada de la Web App son estados distintos. Actualizar una rama de GitHub no despliega automáticamente la aplicación.

La sincronización prevista se realizará con `clasp` y/o GitHub Actions, separando el proyecto de Apps Script de pruebas del de producción. No se debe publicar en producción desde `features` ni desde `dev` sin la aprobación correspondiente.

## Contexto para asistentes de IA

`ai-context.md` recoge decisiones funcionales, restricciones técnicas y precauciones que deben respetarse al continuar el desarrollo.
