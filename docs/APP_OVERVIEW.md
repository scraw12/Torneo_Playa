# Visión general de la aplicación

## Objetivo y fuente revisada

Torneo_Playa gestiona torneos de vóley playa 2 contra 2 mediante Google Sheets, Google Apps Script y una Web App. La referencia revisada para esta actualización es la exportación PDF de 14 páginas facilitada como `Torneo_Voley`.

**Limitación de la fuente:** el archivo recibido es PDF, no Excel. Permite verificar los títulos y encabezados impresos, pero no fórmulas, validaciones, protecciones, rangos ocultos ni automatismos. Los detalles funcionales de reglas que siguen proceden del contexto previo del proyecto y no quedan demostrados por el PDF.

## Estructura del libro observada

- **Panel de control:** Generar Fase 1, Actualizar clasificación, Generar Oro / Plata, Generar eliminatorias, Finalizar torneo y Nuevo torneo. La nota indica que los resultados se introducen en FASE1 y ELIMINATORIAS.
- **Configuración:** nombre del torneo, fecha, partidos por jugador, número de pistas, máxima diferencia de posiciones en pareja final, mínimo de partidos y jugadores en Oro.
- **Jugadores:** Jugador, Activo, Partidos, Genero y BL.
- **Fase 1:** Partido, Pista, Ronda, Jugador 1, Jugador 2, VS, Jugador 3, Jugador 4, Puntos equipo 1 y Puntos equipo 2.
- **Clasificación:** Pos., Jugador, PJ, V, D, PF, PC, Dif., % Vict., Desempate manual y Aviso.
- **Oro/Plata:** Competición, Pos., Jugador, Pareja e ID Pareja.
- **Eliminatorias:** Competición, Ronda, Partido, Pareja 1, Pareja 2, Puntos 1, Puntos 2 y Ganador. El PDF repite esta estructura en varias páginas.
- **Histórico de jugadores:** Jugador, Torneos, PJ, V, D, PF, PC, Dif., % Vict., Oro campeón, Oro subcampeón, Plata campeón y Plata subcampeón.
- **Histórico de torneos:** Fecha, Torneo, Jugador, PJ, V, D, PF, PC, Dif., % Vict., Competición final y Resultado final.

El detalle de campos está en [Esquema del libro](DATABASE_SCHEMA.md). Los nombres de pestaña entre paréntesis en ese documento son nombres funcionales conocidos y deben confirmarse con el Excel original.

## Recorrido operativo

1. Configurar el torneo y los participantes.
2. Generar Fase 1.
3. Introducir resultados y actualizar la clasificación.
4. Generar Oro/Plata.
5. Generar y gestionar las eliminatorias.
6. Finalizar el torneo o iniciar uno nuevo.

La configuración de ejemplo impresa en el PDF muestra: Torneo mensual, 14/11/2026, 4 partidos por jugador, 4 pistas, diferencia máxima 3, mínimo 4 partidos y 16 jugadores en Oro. Son valores de esa exportación, no valores por defecto garantizados.

## Reglas funcionales conocidas de Fase 1

Estas reglas proceden del contexto previo del proyecto y deben contrastarse con el código vigente y el Excel original:

### Género

1. Regla 1 (activada por defecto): un equipo formado por dos chicas solo puede enfrentarse a otro equipo formado por dos chicas.
2. Regla 2 (desactivada por defecto): si un equipo contiene alguna chica, el equipo rival también debe contener al menos una chica.
3. Regla 3 (desactivada por defecto): cada chica debe participar al menos en un partido en el que los cuatro participantes sean chicas.

Los valores conocidos de Genero son Chico y Chica.

### BL

La regla BL es independiente de las reglas de género. La lógica conocida limita por separado los partidos de un jugador sin BL con un compañero BL y los partidos contra un equipo que contiene un jugador BL. Los detalles de implementación y valores por defecto deben verificarse en el código vigente.

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

## Pendiente de verificación

Para cerrar el modelo de datos hacen falta el Excel original o acceso al Google Sheet y al código vigente. Quedan por verificar fórmulas, validaciones, protecciones, rangos ocultos, listas desplegables, relaciones por ID y nombres exactos de todas las pestañas.
