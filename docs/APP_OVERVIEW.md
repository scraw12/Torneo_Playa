# Visión general de la aplicación

## Objetivo y fuente revisada

Torneo_Playa gestiona torneos de vóley playa 2 contra 2 mediante Google Sheets, Google Apps Script y una Web App.

Esta versión de la documentación se ha contrastado con el libro original `Torneo_Voley.xlsx`, no solo con su exportación PDF. Se han inspeccionado las nueve pestañas, sus celdas con contenido, fórmulas, validaciones, rangos ocultos y nombres definidos.

**Alcance:** el Excel confirma la estructura del libro y sus datos de ejemplo. La lógica ejecutada por Apps Script (generación de partidos, clasificación, restricciones y cálculos) debe documentarse a partir del código fuente, no deducirse del archivo de datos.

## Estructura del libro

El libro contiene nueve pestañas visibles:

- `PANEL`: acciones para generar Fase 1, actualizar clasificación, generar Oro/Plata, generar eliminatorias, finalizar torneo y crear uno nuevo. La nota de la hoja indica que los resultados se introducen directamente en `FASE1` y `ELIMINATORIAS`.
- `CONFIG`: nombre y fecha del torneo, partidos por jugador, número de pistas, diferencia máxima de posiciones en pareja final, mínimo de partidos y jugadores en Oro.
- `JUGADORES`: participante, estado activo, contador de partidos, género y marca BL.
- `FASE1`: identificación del partido, pista, ronda, cuatro jugadores, separador VS y puntos de ambos equipos.
- `CLASIFICACION`: posición, jugador, partidos jugados, victorias, derrotas, puntos a favor/en contra, diferencia, porcentaje de victorias, desempate manual y aviso.
- `ORO_PLATA`: competición, posición, jugador, pareja e ID de pareja.
- `ELIMINATORIAS`: competición, ronda, partido, parejas, puntuaciones y ganador.
- `HIST_JUGADORES`: estadísticas agregadas por jugador y títulos/subcampeonatos.
- `HIST_TORNEOS`: estadísticas por torneo y jugador, competición final y resultado final.

El detalle de encabezados, capacidad observada y limitaciones de inspección está en [Esquema del libro](DATABASE_SCHEMA.md).

## Recorrido operativo

1. Configurar el torneo y los participantes.
2. Generar Fase 1.
3. Introducir resultados y actualizar la clasificación.
4. Generar Oro/Plata.
5. Generar y gestionar las eliminatorias.
6. Finalizar el torneo o iniciar uno nuevo.

Los valores encontrados en la hoja `CONFIG` del archivo inspeccionado son datos de ejemplo: Torneo mensual, 14/11/2026, 4 partidos por jugador, 4 pistas, diferencia máxima 3, mínimo 4 partidos y 16 jugadores en Oro. No deben interpretarse automáticamente como valores por defecto del código.

## Reglas funcionales conocidas de Fase 1

Estas reglas proceden del contexto funcional previo del proyecto y no se pueden demostrar inspeccionando únicamente el libro Excel. Deben contrastarse con el código vigente:

### Género

1. Regla 1 (activada por defecto): un equipo formado por dos chicas solo puede enfrentarse a otro equipo formado por dos chicas.
2. Regla 2 (desactivada por defecto): si un equipo contiene alguna chica, el equipo rival también debe contener al menos una chica.
3. Regla 3 (desactivada por defecto): cada chica debe participar al menos en un partido en el que los cuatro participantes sean chicas.

Los valores de ejemplo observados en la columna `Genero` son `Chico` y `Chica`.

### BL

La hoja contiene una columna `BL`. La regla funcional conocida es independiente de las reglas de género y limita por separado los partidos de un jugador sin BL con un compañero BL y los partidos contra un equipo que contiene un jugador BL. Los detalles y valores por defecto deben verificarse en el código vigente.

## Componentes técnicos conocidos

| Archivo | Responsabilidad |
|---|---|
| `000_Core.gs` | Configuración y funciones centrales. |
| `001_Utils.gs` | Utilidades comunes. |
| `002_Phase1.gs` | Generación de Fase 1. |
| `003_Standings.gs` | Resultados y clasificación. |
| `004_FinalStage.gs` | Fase Oro/Plata. |
| `005_Knockouts.gs` | Eliminatorias. |
| `006_History.gs` | Histórico. |
| `007_Admin.gs` | Administración. |
| `008_WebApp.gs` | Servicios de la Web App. |
| `009_KnockoutManagement.gs` | Gestión de eliminatorias. |
| `010_Phase1PlayerManagement.gs` | Gestión de jugadores en Fase 1. |
| `012_TournamentRules.gs` | Reglas de torneo. |
| `index.html` | Interfaz Web App. |

Los nombres de funciones y variables se mantienen en inglés; los nombres de hojas y etiquetas visibles se mantienen en español.

## Observaciones técnicas del Excel inspeccionado

- Las nueve pestañas están visibles.
- No se encontraron fórmulas de Excel en las celdas inspeccionadas.
- No se encontraron reglas de validación de datos.
- No se encontraron nombres definidos, tablas estructuradas, filas ocultas ni columnas ocultas.
- Las hojas contienen encabezados y estructuras preparadas para que la lógica externa las rellene o procese.

La ausencia de fórmulas en el libro no significa que no existan cálculos: estos pueden realizarse en Apps Script.

## Pendiente de verificación en código

Para completar la especificación funcional hay que contrastar con el código vigente las fórmulas/cálculos de clasificación e históricos, las restricciones de generación, los valores por defecto de reglas, las relaciones por ID y las protecciones o permisos aplicados desde Apps Script.


## Revisión del código fuente

El comportamiento implementado y los hallazgos técnicos se documentan en [Revisión estática del código](CODE_REVIEW.md). Esa revisión distingue la lógica observada de los riesgos pendientes y de las pruebas que todavía no se han ejecutado.


## Permisos de la Web App

La vista pública puede guardar y modificar marcadores de Fase 1 y eliminatorias, tanto de forma individual como múltiple. La asignación de un jugador a un slot `PENDIENTE` queda restringida a administradores: el editor solo se muestra en la vista administrativa y el endpoint de servidor exige `requireAdmin()`. No se permite registrar el resultado de una eliminatoria mientras alguna de sus parejas siga conteniendo `PENDIENTE`.

La revisión de implementación y los casos de prueba están en [CODE_REVIEW.md](CODE_REVIEW.md) y [tests/README.md](../tests/README.md).
