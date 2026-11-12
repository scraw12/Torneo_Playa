# Esquema del libro de torneo

## Fuente y alcance

Documento contrastado con el archivo original `Torneo_Voley.xlsx`. Se inspeccionaron las nueve pestañas, las celdas no vacías, las fórmulas, las validaciones, las tablas, los nombres definidos y las filas/columnas ocultas.

El libro contiene nueve pestañas visibles. No se encontraron fórmulas de Excel, validaciones de datos, tablas estructuradas, nombres definidos ni filas/columnas ocultas. Los cálculos pueden estar implementados en Apps Script y no en las celdas.

Los datos de participantes del archivo son datos de ejemplo y no se reproducen en esta documentación.

## 1. PANEL

**Dimensión utilizada:** 10 filas × 8 columnas.

| Celda / campo | Contenido |
|---|---|
| A1 | PANEL DE CONTROL |
| A2:B2 | Acción / Activar |
| A3:B3 | Generar Fase 1 / checkbox |
| A4:B4 | Actualizar clasificación / checkbox |
| A5:B5 | Generar Oro / Plata / checkbox |
| A6:B6 | Generar eliminatorias / checkbox |
| A7:B7 | Finalizar torneo / checkbox |
| A8:B8 | Nuevo torneo / checkbox |
| A10:H10 | Nota de uso |

La nota indica que se pueden usar los checkboxes o el menú `🏐 TORNEO`, y que los resultados se introducen directamente en `FASE1` y `ELIMINATORIAS`.

## 2. CONFIG

**Dimensión utilizada:** 8 filas × 2 columnas.

| Celda | Campo | Valor del archivo inspeccionado |
|---|---|---|
| A2:B2 | Nombre del torneo | Torneo mensual |
| A3:B3 | Fecha | 14/11/2026 |
| A4:B4 | Partidos por jugador | 4 |
| A5:B5 | Número de pistas | 4 |
| A6:B6 | Máx. diferencia de posiciones en pareja final | 3 |
| A7:B7 | Mínimo de partidos | 4 |
| A8:B8 | Jugadores en ORO | 16 |

Estos son valores almacenados en el archivo proporcionado, no necesariamente valores por defecto del código.

## 3. JUGADORES

**Dimensión utilizada:** 1.000 filas × 5 columnas.

| Columna | Encabezado | Tipo/uso observado |
|---|---|---|
| A | Jugador | Texto; nombre del participante |
| B | Activo | Booleano; estado de participación |
| C | Partidos | Numérico; contador |
| D | Genero | Texto; valores de ejemplo `Chico` y `Chica` |
| E | BL | Marca de participante BL; en el ejemplo aparece `x` o vacío |

No se observa un identificador único de jugador en las columnas de esta hoja. No asumir que el nombre es una clave estable sin revisar el código.

## 4. FASE1

**Dimensión utilizada:** 32 filas × 10 columnas.

| Columna | Encabezado |
|---|---|
| A | Partido |
| B | Pista |
| C | Ronda |
| D | Jugador 1 |
| E | Jugador 2 |
| F | VS |
| G | Jugador 3 |
| H | Jugador 4 |
| I | Puntos equipo 1 |
| J | Puntos equipo 2 |

La hoja contiene los encabezados, sin partidos cargados en el archivo inspeccionado.

## 5. CLASIFICACION

**Dimensión utilizada:** 32 filas × 11 columnas.

| Columna | Encabezado |
|---|---|
| A | Pos. |
| B | Jugador |
| C | PJ |
| D | V |
| E | D |
| F | PF |
| G | PC |
| H | Dif. |
| I | % Vict. |
| J | Desempate manual |
| K | Aviso |

La nota del libro indica que se debe introducir una posición manual única para cada jugador empatado del grupo y ejecutar después «Actualizar clasificación».

## 6. ORO_PLATA

**Dimensión utilizada:** 32 filas × 5 columnas.

| Columna | Encabezado |
|---|---|
| A | Competición |
| B | Pos. |
| C | Jugador |
| D | Pareja |
| E | ID Pareja |

El libro no permite determinar por sí solo si `ID Pareja` es una clave persistente, temporal o generada por Apps Script.

## 7. ELIMINATORIAS

**Dimensión utilizada:** 199 filas × 8 columnas.

| Columna | Encabezado |
|---|---|
| A | Competición |
| B | Ronda |
| C | Partido |
| D | Pareja 1 |
| E | Pareja 2 |
| F | Puntos 1 |
| G | Puntos 2 |
| H | Ganador |

La hoja tiene una única estructura tabular de ocho columnas en el archivo original.

## 8. HIST_JUGADORES

**Dimensión utilizada:** 32 filas × 28 columnas; los encabezados visibles ocupan A:M.

| Columna | Encabezado |
|---|---|
| A | Jugador |
| B | Torneos |
| C | PJ |
| D | V |
| E | D |
| F | PF |
| G | PC |
| H | Dif. |
| I | % Vict. |
| J | Oro campeón |
| K | Oro subcampeón |
| L | Plata campeón |
| M | Plata subcampeón |

Las columnas N:AB no tienen encabezados ni contenido en el archivo inspeccionado. No asignarles significado sin revisar el código o el libro de trabajo activo.

## 9. HIST_TORNEOS

**Dimensión utilizada:** 32 filas × 12 columnas.

| Columna | Encabezado |
|---|---|
| A | Fecha |
| B | Torneo |
| C | Jugador |
| D | PJ |
| E | V |
| F | D |
| G | PF |
| H | PC |
| I | Dif. |
| J | % Vict. |
| K | Competición final |
| L | Resultado final |

## Relaciones y cálculos

El archivo Excel no contiene fórmulas que permitan establecer el cálculo de PJ, V, D, PF, PC, Dif. o % Vict. Tampoco define claves o relaciones mediante nombres definidos o tablas estructuradas.

Las relaciones funcionales esperables entre jugadores, partidos, clasificación, parejas e históricos deben confirmarse en el código Apps Script. En particular:
- Si el nombre del jugador es la clave de referencia o existe un ID gestionado por código.
- Cómo se genera y utiliza `ID Pareja`.
- Cómo se vinculan los registros de `ELIMINATORIAS` con `ORO_PLATA`.
- Qué columnas se rellenan manualmente y cuáles se regeneran desde Apps Script.
- Qué rangos y permisos protege la aplicación.

## Nota de mantenimiento

Si cambia el libro, actualizar este documento a partir del archivo original y conservar separada la información observada en Excel de la lógica confirmada en Apps Script.


## Correspondencia con el código

La lectura/escritura de celdas, los cálculos, los identificadores y las convenciones de relación entre hojas están descritos en [Revisión estática del código](CODE_REVIEW.md). El esquema del libro por sí solo no contiene fórmulas de Excel que permitan inferir esos comportamientos.
