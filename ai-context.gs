/**
# CONTEXTO ACTUALIZADO — TORNEO DE VÓLEY PLAYA 2x2

**Fecha de actualización:** 9 de octubre de 2026  
**Uso:** documento para retomar el desarrollo en otra conversación. Este documento resume las reglas acordadas y el estado más reciente comunicado por el usuario.

## 1. Objetivo del proyecto

Crear una aplicación para gestionar un torneo recreativo de vóley playa 2 contra 2 que se organiza aproximadamente una vez al mes.

- **Google Sheets** es la base de datos.
- **Google Apps Script** contiene la lógica del torneo y el backend.
- **Google Web App** es la interfaz para consultar el torneo y, según los permisos de la versión configurada, introducir resultados y administrar el torneo.
- Los jugadores no deben necesitar acceso directo a la hoja de cálculo.
- Las pistas se asignan manualmente; el sistema no debe asignarlas automáticamente.
- Los nombres de funciones y variables de Apps Script deben estar en inglés. Los nombres de las hojas y los textos de la interfaz pueden estar en español.
- La prioridad es conservar las funciones que ya trabajan y corregir de forma localizada, indicando el fichero, función y bloque exactos que hay que cambiar.

## 2. Archivos modulares del proyecto

Nombres usados en la versión modular:

- `00_Core.gs`
- `01_Utils.gs`
- `02_Phase1.gs`
- `03_Standings.gs`
- `004_FinalStage.gs`
- `005_Knockout.gs`
- `06_History.gs`
- `07_Admin.gs`
- `008_WebApp.gs`
- `Index.html` (puede aparecer como `index.html` en una copia local)

Los números `004`, `005` y `008` forman parte de los nombres usados en esta versión concreta; no renombrarlos sin actualizar las referencias relacionadas.

**Importante sobre el ámbito global:** todos los archivos `.gs` del mismo proyecto comparten el ámbito global. La constante `SHEETS` debe declararse una sola vez. Si se copian archivos monolíticos antiguos junto a los modulares, puede aparecer `SyntaxError: Identifier 'SHEETS' has already been declared`.

## 3. Hojas principales

- `PANEL`: acciones de administración, si se usa en la versión instalada.
- `CONFIG`: parámetros del torneo.
- `JUGADORES`: participantes y estado activo.
- `FASE1`: partidos de la fase inicial y sus marcadores.
- `CLASIFICACION`: clasificación individual.
- `ORO_PLATA`: jugadores asignados a categoría y parejas fijas de la fase final.
- `ELIMINATORIAS`: cuadros de ORO y PLATA y sus resultados.
- `HIST_JUGADORES`: estadísticas acumuladas por jugador.
- `HIST_TORNEOS`: datos históricos por torneo y jugador.

En `ORO_PLATA`, las columnas relevantes son:

`Competición | Pos. | Jugador | Pareja | ID Pareja`

En `ELIMINATORIAS`, las columnas relevantes son:

`Competición | Ronda | Partido | Pareja 1 | Pareja 2 | Puntos 1 | Puntos 2 | Ganador`

## 4. Configuración

La configuración definida para el proyecto incluye:

- Nombre del torneo.
- Fecha.
- Partidos por jugador.
- Número de pistas.
- Diferencia máxima de posiciones permitida para crear parejas finales.
- Mínimo de partidos por jugador.
- Número de jugadores que pasan a ORO.

En la versión documentada anteriormente, estos campos ocupaban `CONFIG!B2:B8`, con el número de jugadores de ORO en `B8`. Confirmar las celdas en el código instalado antes de reorganizar la hoja.

## 5. Fase 1: reglas acordadas

- Participan todos los jugadores activos.
- Todos deben jugar el mismo número de partidos.
- El número de partidos debe respetar la configuración y el mínimo configurado.
- Las parejas y los enfrentamientos se generan aleatoriamente.
- No se debe repetir compañero durante la Fase 1.
- No se utiliza el histórico para generar las parejas de Fase 1.
- La asignación de pistas es manual.
- La columna `VS` debe quedar entre `Jugador 2` y `Jugador 3`.
- Los marcadores de los dos equipos se guardan para calcular las estadísticas y la diferencia de puntos.

Cabecera esperada de `FASE1`:

`Partido | Pista | Ronda | Jugador 1 | Jugador 2 | VS | Jugador 3 | Jugador 4 | Puntos equipo 1 | Puntos equipo 2`

## 6. Clasificación

Criterios de orden, por prioridad:

1. Victorias.
2. Diferencia de puntos.
3. Puntos a favor.

Las victorias siempre tienen prioridad sobre la diferencia de puntos.

También se ha pedido poder resolver manualmente empates completos y mostrar visualmente cuándo hay un desempate pendiente o resuelto. No asumir que todos los detalles de avisos de empate están totalmente validados sin comprobar la versión instalada.

## 7. Generación de ORO y PLATA

La fase final se genera después de actualizar la clasificación.

- ORO tiene el número de jugadores configurado, siempre que pueda formar un cuadro limpio según la validación del código.
- PLATA recibe el resto.
- Ejemplo habitual: con **31 participantes**, la distribución esperada es **16 en ORO y 15 en PLATA**.
- Los jugadores de ambas categorías se emparejan siguiendo las posiciones de clasificación y una diferencia máxima configurable.
- Las estadísticas históricas no se utilizan para estas parejas.
- Las parejas se consideran fijas una vez creadas.
- Está permitido que una pareja de la fase final repita compañeros que ya estuvieron juntos en Fase 1.
- Para una categoría con cantidad impar, la primera persona de esa categoría queda registrada con pareja `PENDIENTE`; no deben aparecer varias parejas pendientes por el mero hecho de que la categoría tenga un jugador impar.

### Fichero responsable

`004_FinalStage.gs`

Funciones relevantes:

- `generateConstrainedPairs(...)`
- `generateConstrainedPairsAllowOdd(...)`
- `generateGoldSilver()`
- `getFinalPairs(group)`

`generateConstrainedPairsAllowOdd()` deja a la primera persona sin pareja si el grupo tiene número impar. `generateGoldSilver()` escribe las parejas en `ORO_PLATA` y después llama a `generateKnockout()`.

### Regla práctica para evitar perder las parejas ya creadas

Si las parejas de `ORO_PLATA` ya son correctas y solo hay que corregir o reconstruir el cuadro, ejecutar **Generar eliminatorias**; no pulsar **Generar ORO/PLATA**, porque esa acción vuelve a generar las parejas y puede cambiar el sorteo.

## 8. Eliminatorias: reglas acordadas

- Hay cuadros independientes de ORO y PLATA.
- Según el tamaño, el cuadro puede incluir cuartos, semifinales y final, o solamente semifinales y final.
- Deben soportarse categorías impares y plazas `PENDIENTE` sin crear entradas duplicadas innecesarias.
- Al guardar un resultado, el ganador debe avanzar al partido siguiente.
- Si se corrige un resultado anterior, hay que recalcular el ganador y la progresión posterior.
- La Web App debe permitir gestionar el compañero de una pareja `PENDIENTE` cuando esa función esté habilitada; hay que verificar persistencia antes de darla por validada.

### Regla de protección del mejor clasificado

Se solicitó que el equipo del jugador individual número 1 y el equipo del jugador mejor clasificado que no sea su compañero queden en mitades opuestas del cuadro, para que no se enfrenten antes de la final.

La identificación se basa en los registros de `ORO_PLATA` y el ID de pareja. El resto de equipos se puede distribuir aleatoriamente dentro de las posiciones restantes.

### Últimos arreglos confirmados por el usuario

En `005_Knockout.gs` se han trabajado dos arreglos:

1. **Rellenar los huecos del cuadro correctamente.** En `seedBracketSlots()`, no usar `result.map(...)` para localizar posiciones libres de `new Array(...)`, porque las posiciones vacías de un array disperso se omiten al ejecutar `map()`. El código debe recorrer los índices explícitamente y recoger aquellos donde `result[index] === undefined`.
2. **Reconocer la pareja incompleta de PLATA.** En `getProtectedBracketTeams(group)`, al construir el nombre de una pareja con un solo jugador, se debe incluir también el valor de la columna Pareja aunque sea `PENDIENTE`, para que el nombre normalizado coincida con la pareja del cuadro. El cambio acordado fue:

```javascript
if (names.length === 1 && teamRows[0][3]) {
  names.push(String(teamRows[0][3]).trim());
}
```

En el código anterior, la condición excluía explícitamente `PENDIENTE`; esto hacía que esa pareja no se identificara con la misma clave que en el cuadro. Tras aplicar el cambio, el usuario indicó: **«Perfecto, así parece que funciona correctamente»**.

**Advertencia sobre copias locales:** una copia descargada de `005_Knockout.gs` puede no contener el último cambio manual de `getProtectedBracketTeams()`. La versión que se confirmó como aparentemente funcional es la que está editada en el proyecto activo de Apps Script. Antes de sustituir el fichero entero por una copia antigua, comprobar que mantiene ambos arreglos.

## 9. Web App y administración

La Web App incluye vistas para:

- Resumen.
- Fase 1.
- Clasificación.
- ORO.
- PLATA.
- Eliminatorias.
- Administración cuando el usuario tiene permisos.

La sección de administración debe aparecer primero en el flujo del administrador. Los jugadores no deben necesitar acceso directo al Google Sheet.

Se ha trabajado con `008_WebApp.gs` e `Index.html`. En el HTML hubo un problema en el que las cabeceras de tabla quedaban fijadas o se veían centradas en una posición incorrecta; la corrección acordada fue evitar el `position: sticky` y el `top` no deseado en `th`, usando un posicionamiento estático si esa incidencia reaparece.

La identificación de administrador debe gestionarse desde el backend/propiedades del script, no mediante una contraseña incrustada en JavaScript del navegador. La forma exacta de autenticación y los permisos reales dependen de la implementación y despliegue activos.

La URL estándar de una Web App la proporciona Google. Para usar una URL personalizada se necesita una solución externa de dominio, redirección o proxy; no se puede cambiar directamente la URL `script.google.com` desde Apps Script.

## 10. Historial

Hojas previstas:

- `HIST_JUGADORES`
- `HIST_TORNEOS`

Estadísticas solicitadas:

- Partidos jugados, victorias y derrotas.
- Puntos a favor y en contra.
- Diferencia de puntos.
- Porcentaje de victorias.
- Número de campeonatos y subcampeonatos de ORO/PLATA.
- Registro de los torneos anteriores.

El histórico no debe utilizarse para crear parejas de Fase 1 ni las parejas de ORO/PLATA bajo las reglas actuales.

## 11. Errores anteriores conocidos

- `SyntaxError: Identifier 'SHEETS' has already been declared`: suele indicar duplicación de la constante global o mezcla de archivos monolíticos y modulares.
- `The number of columns in the data does not match the number of columns in the range`: la matriz escrita mediante `setValues()` no tenía las mismas columnas que el rango.
- `Error: Tipo de match no válido`: se había detectado una discrepancia entre un tipo enviado por el frontend (`KO`) y el valor esperado por el backend (`ELIMINATORIAS`). Si reaparece, revisar ambos lados antes de cambiar la lógica del torneo.
- En las eliminatorias, un array disperso en `seedBracketSlots()` podía dejar posiciones sin rellenar; revisar el bucle que identifica índices vacíos.
- La pareja `PENDIENTE` de PLATA no se identificaba correctamente para la lógica de protección del cuadro hasta incluir también ese nombre al construir la clave del equipo.

## 12. Estado más reciente

### Confirmado por el usuario

- La generación de ORO parece correcta.
- Había un problema en PLATA con la identificación de la pareja que contiene `PENDIENTE`.
- Tras modificar el bloque de `getProtectedBracketTeams()` de `005_Knockout.gs` para incluir `PENDIENTE`, el usuario indicó que aparentemente funciona correctamente.

### No afirmar sin volver a probar

- Que todos los flujos de la Web App están probados de extremo a extremo.
- Que el guardado/corrección de resultados y la progresión del ganador funcionan en todos los escenarios.
- Que la edición de un compañero `PENDIENTE` desde la Web App se guarda de forma persistente.
- Que todos los casos límite de cuadros pequeños o números impares se han probado con datos reales.

## 13. Cómo continuar el desarrollo

1. Mantener `ORO_PLATA` como fuente de verdad para las parejas ya generadas.
2. Para modificar la lógica de los cuadros, trabajar primero en `005_Knockout.gs` y no cambiar `004_FinalStage.gs` salvo que el problema esté en la creación de parejas.
3. No ejecutar `Generar ORO/PLATA` cuando solo se quiera reconstruir el cuadro, porque puede volver a sortear las parejas.
4. Antes de un cambio, identificar el fichero y la función responsable; intentar una modificación mínima.
5. Después del cambio, validar sintaxis y, cuando sea posible, probar un caso par y uno impar. Para el caso de 31 participantes, verificar 16 jugadores en ORO, 15 en PLATA y solo una pareja `PENDIENTE` en PLATA.
6. No introducir cambios en reglas que el usuario ya confirmó sin explicarlos y aislarlos.
7. Recordar que una comprobación sintáctica no equivale a una prueba real sobre el Google Sheet desplegado.

## 14. Instrucción breve para iniciar una nueva conversación

Puedes pegar este texto junto con este archivo:

> Continúa el proyecto de gestión del torneo de vóley playa 2x2 basándote en `Contexto_Proyecto_Torneo_Voley_ACTUALIZADO_2026-10-09.md`. Respeta las reglas y el estado confirmado del documento. El proyecto usa Google Sheets + Apps Script modular + Web App. La generación de ORO funciona y el último arreglo de PLATA se hizo en `005_Knockout.gs`, en `getProtectedBracketTeams()`, incluyendo `PENDIENTE` al construir el nombre de una pareja incompleta. El usuario confirmó que aparentemente funciona. No regeneres ORO/PLATA si solo hay que rehacer eliminatorias. Antes de proponer cambios, señala el fichero, la función y el bloque exacto; evita reescribir partes que funcionan y distingue lo confirmado de lo que aún no se ha probado.

 * 
 */