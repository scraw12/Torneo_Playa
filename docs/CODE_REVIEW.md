# Revisión estática del código Apps Script

## Fuente y alcance

Revisión de los archivos de la rama dev: 000_Core.gs, 001_Utils.gs, 002_Phase1.gs, 003_Standings.gs, 004_FinalStage.gs, 005_Knockouts.gs, 006_History.gs, 007_Admin.gs, 008_WebApp.gs, 009_KnockoutManagement.gs, 010_Phase1PlayerManagement.gs, 012_TournamentRules.gs e index.html.

Esta es una revisión estática del código descargado de GitHub. No se han ejecutado las funciones en Apps Script, ni se ha probado el comportamiento con una hoja real o una implementación desplegada. Las observaciones se clasifican como comportamiento visible en código, riesgo o decisión pendiente.

## Comportamiento confirmado en código

### Configuración y participantes
- getConfig() lee CONFIG!B2:B8. B4 se fuerza a ser al menos B7. B5 y B6 tienen mínimo 1; B7 mínimo 1; B8 es entero no negativo.
- getPlayers() lee únicamente columnas A:B de JUGADORES. Un jugador se considera activo si B es TRUE o está vacío.
- setupTournament() crea hojas que falten e inicializa hojas vacías. La definición inicial de JUGADORES solo incluye Jugador y Activo; no crea Partidos, Genero ni BL en una hoja nueva.
- El panel usa checkboxes en B3:B8 y onEdit(e) despacha las acciones.

### Fase 1
- Requiere al menos cuatro jugadores y que jugadores × partidos por jugador sea divisible entre cuatro.
- Cada partido contiene cuatro jugadores, dos equipos de dos.
- Se evita repetir parejas de compañeros.
- Pista y marcadores se dejan vacíos al generar.
- Para exactamente cuatro partidos por jugador y seis o más jugadores, construye partidos con posiciones cíclicas i, i+1, i+2 e i+4 del orden barajado y prueba hasta 5.000 órdenes.
- Para otras configuraciones usa una construcción voraz con hasta 1.000 intentos globales y un máximo de 500 intentos por partido (ajustado al número de jugadores).
- El calendario existente se limpia solo después de encontrar un calendario válido.
- generateRound() está definida pero no se llama desde generatePhase1().

### Reglas de género y BL
- Las tres reglas de género se guardan en Script Properties. Regla 1 predeterminada true; reglas 2 y 3 predeterminadas false.
- La regla BL se guarda en PHASE1_BL_RULE y está predeterminada true.
- Género válido: Chico o Chica. Si alguna regla de género está activa, se exige género válido a todos los jugadores activos.
- BL se marca con X. La columna puede crearse al final de JUGADORES si falta.
- Las restricciones BL para jugador sin BL son dos contadores independientes: máximo un partido con compañero BL y máximo un partido contra un equipo con BL. Jugadores BL quedan exentos de estos límites propios.
- Estas reglas solo se aplican a Fase 1 y a la redistribución de alta de jugador.

### Clasificación
- Solo procesa partidos con ambos marcadores presentes y reconocidos los cuatro jugadores.
- PJ cuenta partidos completos; V/D según ganador; PF/PC acumulan la puntuación de cada equipo para cada uno de sus dos jugadores; Dif = PF - PC; porcentaje = V/PJ, o cero sin partidos.
- Orden: victorias DESC, diferencia DESC, puntos a favor DESC y desempate manual ASC.
- El desempate manual se conserva por nombre, no por número de fila. En grupos empatados debe ser positivo y único para cada jugador.

### Oro/Plata y eliminatorias
- Oro recibe los primeros CONFIG!B8 clasificados; Plata recibe el resto.
- Las parejas se forman mediante backtracking aleatorio, limitando la diferencia absoluta de posiciones a CONFIG!B6.
- En grupos impares, el jugador con mejor posición queda sin pareja y su pareja se guarda como PENDIENTE.
- generateGoldSilver() escribe ORO_PLATA y llama inmediatamente a generateKnockout().
- El cuadro usa tamaño potencia de dos y rondas previas para tamaños irregulares. Usa tokens Ganador {id} para conectar rondas.
- Se intenta colocar en mitades opuestas el equipo del jugador mejor clasificado y el equipo del mejor clasificado que no es su compañero.

### Histórico y nuevo torneo
- finishTournament() actualiza clasificación antes de archivar.
- Detecta campeón y subcampeón buscando filas cuya ronda sea exactamente Final y comparando puntuaciones.
- HIST_JUGADORES acumula torneos, PJ, V, D, PF, PC, diferencia, porcentaje y títulos/subtítulos de Oro/Plata.
- HIST_TORNEOS evita duplicados mediante fecha + nombre de torneo + jugador.
- newTournament() limpia FASE1, CLASIFICACION, ORO_PLATA y ELIMINATORIAS; conserva jugadores, configuración e históricos.

### Web App y permisos
- El acceso administrativo utiliza cuentas individuales de usuario y contraseña, con hashes PBKDF2-HMAC-SHA256 y sal por cuenta.
- El propietario registra su cuenta de Google desde el editor mediante configureAdministrator() y gestiona usuarios desde el menú de la hoja.
- Las sesiones se guardan en CacheService, tienen caducidad deslizante de seis horas y se revocan al cerrar sesión o eliminar la cuenta.
- Los endpoints administrativos exigen un token y validan requireAdmin(sessionToken). Los puntos de entrada internos del motor terminan en guion bajo para que no sean invocables desde google.script.run.
- savePublicResult() y savePublicScoreMultiple() siguen permitiendo guardar marcadores desde la vista pública, como decisión funcional del proyecto.
- savePendingPlayer() ya no es público: exige una sesión administrativa válida.
- Los datos públicos no incluyen explícitamente las columnas de género ni BL.

## Hallazgos que requieren atención

### 1. Funciones globales duplicadas — prioridad alta
doGet, getPublicTournamentData, savePublicResult, savePendingPlayer y propagateKnockoutWinner_ aparecen definidas en 004_FinalStage.gs y 008_WebApp.gs. Todos los archivos .gs del proyecto comparten el ámbito global. Debe mantenerse una única implementación por nombre. Además, las implementaciones de savePublicResult no son idénticas: la de 004 busca por la columna C incluso para FASE1; la de 008 busca FASE1 por columna A y eliminatorias por columna C. La duplicidad hace inseguro asumir qué cuerpo será el efectivo.

### 2. Inicialización incompleta de JUGADORES — prioridad alta
setupTournament() inicializa JUGADORES solo con A:B, mientras que las reglas requieren cabeceras Genero y BL, y el módulo de conteo usa Partidos en C. El Excel actual sí contiene A:E. Una hoja nueva creada desde setupTournament() no queda preparada completamente para el resto de módulos.

### 3. Escritura pública de resultados — decisión de seguridad
El guardado público de marcadores se mantiene habilitado deliberadamente. La asignación de jugadores a slots PENDIENTE sí requiere sesión administrativa.

### 4. Alta de jugador: posible estado parcial
adminAddPhase1Player() registra/reactiva al jugador antes del bloque try que escribe el calendario. El rollback cubre errores de escritura del calendario, pero no todos los errores que pudieran ocurrir durante la preparación posterior al alta. Además, la variable displayNames se construye y no se utiliza. Debe probarse la reversión ante errores y los casos de reactivación.

### 5. Contador Partidos
updateKnockoutPlayerCounts_() recalcula JUGADORES!C:C contando apariciones de jugadores en filas de ELIMINATORIAS. No representa el total de partidos de Fase 1 ni el total de partidos disputados; incluye apariciones en las distintas rondas del cuadro.

### 6. Generación limitada
Los generadores son heurísticos/aleatorios y tienen límites de intentos o nodos. Un error de búsqueda no equivale a demostrar imposibilidad matemática. El caso observado de 29 jugadores, 4 partidos por jugador y 4 marcas BL sigue siendo una limitación conocida del generador de Fase 1.

### 7. Posible incoherencia entre panel y flujo
El panel ofrece generar Oro/Plata y generar eliminatorias por separado, pero generateGoldSilver() ya llama a generateKnockout(). Ejecutar la acción de eliminatorias después vuelve a reconstruir el cuadro. Debe decidirse si se conserva este comportamiento o se separan ambas operaciones.

## Pruebas recomendadas antes de considerar fiable el comportamiento

1. Ejecutar setupTournament() sobre una copia vacía y comprobar que crea todas las columnas que necesitan los módulos.
2. Confirmar que queda una sola definición de cada función global duplicada. (Comprobación estática ya realizada en esta rama).
3. Probar el acceso público y administrador con dos cuentas distintas, incluyendo guardado simple y múltiple de resultados y asignación PENDIENTE.
4. Probar Fase 1 con reglas de género y BL individualmente activadas/desactivadas, distintos números de jugadores y distintos partidos por jugador.
5. Probar clasificación con marcador incompleto, empate, puntos a favor y grupos con desempate manual.
6. Probar grupos Oro/Plata pares e impares, restricciones de diferencia de ranking y cuadros de distintos tamaños.
7. Probar propagación de ganadores hasta la final y cierre histórico idempotente.
8. Probar alta/reactivación de jugador, fallo de escritura y rollback.

## Cambios aplicados en la rama de trabajo

Rama: `feature/fix-setup-public-results-tests`, creada desde `dev`.

- Se eliminaron de `004_FinalStage.gs` las cinco definiciones duplicadas de funciones Web App. Las implementaciones quedan centralizadas en `008_WebApp.gs` y las funciones de clasificación/desempate permanecen en `004_FinalStage.gs`.
- `setupTournament()` crea la estructura completa de `JUGADORES` (`Jugador`, `Activo`, `Partidos`, `Genero`, `BL`) y de `CLASIFICACION` (incluida `Aviso`). Para hojas existentes añade cabeceras ausentes insertando columnas, en lugar de sobrescribir celdas con datos.
- El guardado público de resultados simples y múltiples se mantiene habilitado para Fase 1 y eliminatorias.
- La asignación de `PENDIENTE` queda reservada a administradores: el editor no se muestra en la vista pública y `savePendingPlayer(sessionToken, ...)` exige una sesión válida en servidor. Los resultados de eliminatoria siguen bloqueados mientras el partido tenga `PENDIENTE`.
- Se añadió el acceso administrativo por usuario/contraseña, la gestión de cuentas desde el editor y la suite Apps Script `test007AdminAuthentication()` para comprobar login, sesión, logout y revocación.
- Se añadieron pruebas automatizadas Node (`npm test`) con mocks para contratos del código y guardado público simple/múltiple, propagación de ganador y bloqueo de `PENDIENTE`.

## Estado de validación

- Revisión estática de código de GitHub: realizada.
- Comprobación estática de declaraciones globales duplicadas en los 12 módulos `.gs`: no se encontraron duplicados.
- Suite de pruebas Node añadida; todavía no ejecutada en este entorno.
- Ejecución de pruebas unitarias: no realizada en esta revisión.
- Ejecución en Apps Script: no realizada.
- Prueba contra Google Sheet real: no realizada.
- Correcciones de código: no realizadas.
- Despliegue: no realizado.
