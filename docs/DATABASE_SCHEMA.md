# Esquema del libro de torneo

## Fuente y alcance

Este esquema se basa en la exportación PDF de 14 páginas facilitada como `Torneo_Voley`. El archivo recibido es PDF, no un libro `.xlsx`. Se documentan únicamente los títulos y encabezados visibles. Los nombres de pestaña entre paréntesis son nombres funcionales conocidos en el proyecto, pero deben confirmarse con el Excel original.

## Hojas y campos visibles

### Panel de control (`PANEL`)

Acciones: Generar Fase 1; Actualizar clasificación; Generar Oro / Plata; Generar eliminatorias; Finalizar torneo; Nuevo torneo. La hoja indica que los resultados se introducen directamente en FASE1 y ELIMINATORIAS.

### Configuración (`CONFIG`)

| Campo | Valor de ejemplo impreso |
|---|---|
| Nombre del torneo | Torneo mensual |
| Fecha | 14/11/2026 |
| Partidos por jugador | 4 |
| Número de pistas | 4 |
| Máx. diferencia de posiciones en pareja final | 3 |
| Mínimo de partidos | 4 |
| Jugadores en ORO | 16 |

Son valores del documento exportado, no valores por defecto garantizados.

### Jugadores (`JUGADORES`)

| Campo | Descripción aparente |
|---|---|
| Jugador | Nombre visible del participante |
| Activo | Estado de participación |
| Partidos | Contador de partidos |
| Genero | Dato de género |
| BL | Marca BL |

No se reproducen los nombres ni datos de los participantes del ejemplo.

### Fase 1 (`FASE1`)

Partido; Pista; Ronda; Jugador 1; Jugador 2; VS; Jugador 3; Jugador 4; Puntos equipo 1; Puntos equipo 2.

### Clasificación (`CLASIFICACION`)

Pos.; Jugador; PJ; V; D; PF; PC; Dif.; % Vict.; Desempate manual; Aviso.

La nota al pie indica que se debe introducir una posición manual única para cada jugador empatado del grupo y ejecutar después «Actualizar clasificación».

### Oro/Plata (`ORO_PLATA`)

Competición; Pos.; Jugador; Pareja; ID Pareja.

### Eliminatorias (`ELIMINATORIAS`)

Competición; Ronda; Partido; Pareja 1; Pareja 2; Puntos 1; Puntos 2; Ganador. La exportación repite esta estructura en varias páginas; no permite confirmar si son rangos o pestañas diferentes.

### Histórico de jugadores (`HIST_JUGADORES`)

Jugador; Torneos; PJ; V; D; PF; PC; Dif.; % Vict.; Oro campeón; Oro subcampeón; Plata campeón; Plata subcampeón.

### Histórico de torneos (`HIST_TORNEOS`)

Fecha; Torneo; Jugador; PJ; V; D; PF; PC; Dif.; % Vict.; Competición final; Resultado final.

## Relaciones y cálculos pendientes

El PDF no permite confirmar si el nombre del jugador es clave o existe un identificador interno; si ID Pareja es estable o calculado; cómo se relacionan eliminatorias y Oro/Plata; las fórmulas de PJ, V, D, PF, PC, Dif. y % Vict.; qué campos son manuales o calculados; ni las validaciones, listas desplegables, protecciones o rangos ocultos.

Actualizar este esquema tras inspeccionar el Excel original o el Google Sheet.
