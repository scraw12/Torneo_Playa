# Visión general de la aplicación

## Objetivo

Torneo_Playa gestiona torneos de vóley playa 2 contra 2 con un número variable de participantes. La solución utiliza Google Sheets como almacenamiento, Google Apps Script para la lógica y una Web App para las vistas públicas y las operaciones de administración.

La asignación de pistas se realiza manualmente.

## Recorrido de un torneo

### 1. Configuración y participantes

La administración prepara los parámetros del torneo y gestiona los jugadores activos. La información de género y la marca BL se almacenan en la hoja `JUGADORES`, en las columnas `Genero` y `BL`, respectivamente.

### 2. Fase 1

Todos los jugadores activos participan. El calendario debe cumplir estas condiciones:

- Cada jugador disputa exactamente el número de partidos configurado.
- No se repite una pareja de compañeros.
- Los emparejamientos no se calculan a partir de estadísticas históricas.
- Se respetan las reglas de género y BL que estén activadas.
- Las pistas se asignan manualmente.

La administración puede incorporar jugadores después de generar el calendario, siempre que todavía no se haya introducido ningún resultado. La operación redistribuye los partidos intentando modificar lo mínimo posible y conserva el número configurado de partidos por jugador.

### 3. Resultados y clasificación

La administración introduce los resultados. La clasificación utiliza las victorias y la diferencia de puntos; los desempates manuales se pueden gestionar desde la clasificación.

### 4. Oro, Plata y eliminatorias

A partir de la clasificación se configuran los grupos Oro y Plata. Después se generan los cruces eliminatorios y los ganadores avanzan hasta las siguientes rondas.

Las reglas de género y BL descritas para Fase 1 no se aplican a Oro/Plata ni a las eliminatorias.

### 5. Histórico

La aplicación mantiene estadísticas históricas de torneos y jugadores. El histórico sirve para consultar el rendimiento acumulado, pero no debe influir en los emparejamientos de Fase 1.

## Reglas de Fase 1

### Género

Las tres reglas son independientes:

1. **Regla 1 (activada por defecto):** un equipo formado por dos chicas solo puede enfrentarse a otro equipo formado por dos chicas.
2. **Regla 2 (desactivada por defecto):** si un equipo contiene alguna chica, el equipo rival también debe contener al menos una chica.
3. **Regla 3 (desactivada por defecto):** cada chica debe participar al menos en un partido en el que los cuatro participantes sean chicas.

Los valores admitidos en `Genero` son `Chico` y `Chica`. Si hay alguna regla de género activa, todos los jugadores activos deben tener un valor válido.

### BL

La regla BL es independiente de las reglas de género y está activada por defecto:

- Un jugador sin BL puede jugar como máximo un partido con un compañero BL.
- Independientemente, puede jugar como máximo un partido contra un equipo rival que contenga al menos un jugador BL.
- Los dos límites se cuentan por separado.
- Los jugadores con BL no tienen restricciones BL propias.

La marca BL se almacena como `X` en `JUGADORES`. Tanto el género como la marca BL son datos internos y no deben exponerse en la interfaz pública.

## Componentes técnicos

| Archivo | Responsabilidad |
|---|---|
| `000_Core.gs` | Configuración y funciones centrales. |
| `001_Utils.gs` | Utilidades comunes. |
| `002_Phase1.gs` | Generación de Fase 1. |
| `003_Standings.gs` | Resultados y clasificación. |
| `004_FinalStage.gs` | Configuración de la fase Oro/Plata. |
| `005_Knockouts.gs` | Generación y avance de eliminatorias. |
| `006_History.gs` | Estadísticas históricas. |
| `007_Admin.gs` | Autenticación y acciones administrativas. |
| `008_WebApp.gs` | Servicios de la Web App. |
| `009_KnockoutManagement.gs` | Gestión de eliminatorias. |
| `010_Phase1PlayerManagement.gs` | Alta y redistribución de jugadores en Fase 1. |
| `012_TournamentRules.gs` | Reglas de género y BL. |
| `index.html` | Interfaz pública y administración. |

Los archivos `.gs` conviven en un mismo proyecto Apps Script. Los nombres de funciones y variables se mantienen en inglés; los nombres de las hojas de cálculo se mantienen en español.

## Seguridad y datos internos

Las acciones administrativas del backend deben comprobar permisos mediante `requireAdmin()`. La configuración de reglas de género y BL se almacena en Script Properties.

No incluir datos internos de género o BL en las respuestas públicas de la Web App.

## Limitaciones conocidas

La generación de Fase 1 para 4 partidos por jugador utiliza una construcción cíclica con un máximo de 5.000 órdenes aleatorios. No encontrar una solución en esos intentos no demuestra que no exista una solución matemática.

Se ha observado un caso problemático con 29 jugadores, 4 partidos por jugador y 4 jugadores BL. La mejora del algoritmo para incorporar las restricciones BL durante la construcción del calendario debe considerarse pendiente hasta que esté implementada y probada.
