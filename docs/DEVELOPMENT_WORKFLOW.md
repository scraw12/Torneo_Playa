# Flujo de desarrollo y ramas

## Ramas principales

El repositorio utiliza tres ramas permanentes:

| Rama | Propósito | Regla |
|---|---|---|
| `main` | Producción | Contiene la versión estable publicada. No se desarrolla directamente aquí. |
| `dev` | Integración y pruebas | Es el punto de partida obligatorio de cada trabajo y reúne cambios listos para validación conjunta. |
| `features` | Desarrollo temporal | Aloja la implementación de la funcionalidad en curso y sus pruebas unitarias. |

## Flujo de trabajo

1. **Partir de `dev`.** Antes de empezar, revisar su estado y actualizar la rama de trabajo con la versión actual de `dev`.
2. **Desarrollar en `features`.** Implementar la funcionalidad solicitada y añadir o actualizar sus pruebas unitarias.
3. **Validar la funcionalidad.** Ejecutar las pruebas disponibles en `features`. No considerar una prueba superada si solo se ha revisado el código sin ejecutarla.
4. **Integrar en `dev`.** Una vez revisados los cambios, integrar `features` en `dev`.
5. **Probar el conjunto.** Ejecutar pruebas de integración y regresión en `dev`, además de validar en el proyecto de Apps Script de pruebas cuando corresponda.
6. **Promover a producción.** Solo con autorización expresa del usuario, integrar `dev` en `main`.
7. **Etiquetar y desplegar.** Identificar la versión estable con una etiqueta (por ejemplo, `v1.2.0`) y desplegar el proyecto de Apps Script de producción.

## Uso de la rama temporal `features`

`features` se reutiliza como rama temporal de trabajo. Al terminar una funcionalidad:

- Integrar el cambio validado en `dev`.
- Para el siguiente trabajo, actualizar o recrear `features` desde el `dev` actualizado.
- No arrastrar cambios antiguos que ya se hayan integrado.
- Si hay trabajo sin terminar, no sobrescribirlo: revisar primero su estado y conservarlo antes de reiniciar la rama.

No se crea una rama permanente independiente para cada funcionalidad salvo que el usuario lo solicite.

## Política de producción

- `main` debe representar siempre el código estable de producción.
- No hacer commits de desarrollo directamente en `main`.
- No integrar `dev` en `main` sin autorización expresa.
- No sincronizar `features` ni `dev` directamente con el proyecto Apps Script de producción.
- Una actualización de GitHub no significa que Apps Script se haya actualizado ni que la Web App se haya desplegado.

## Entornos de Apps Script

La configuración objetivo es mantener dos proyectos separados:

- **Apps Script de pruebas:** recibe los cambios validados desde `dev`.
- **Apps Script de producción:** recibe exclusivamente versiones aprobadas desde `main`.

La sincronización podrá automatizarse con `clasp` y GitHub Actions. Los identificadores de los proyectos y las credenciales deben configurarse como datos de entorno/secretos; no deben inventarse ni incluirse en documentación pública.

## Pruebas

- **En `features`:** pruebas unitarias de la funcionalidad que se está desarrollando.
- **En `dev`:** pruebas de integración entre módulos y pruebas de regresión del conjunto.
- **En Apps Script de pruebas:** validación del comportamiento real en el entorno de prueba.
- **En producción:** desplegar únicamente una versión aprobada.

Distinguir siempre entre:
1. Código modificado en GitHub.
2. Código sincronizado con el proyecto Apps Script.
3. Web App desplegada y disponible para los usuarios.

Son operaciones distintas y no se debe afirmar que una se ha completado por haber realizado otra.

## Reglas para asistentes y colaboradores

- Confirmar la rama de destino antes de modificar archivos.
- Partir siempre del contenido actual de `dev`.
- Leer el archivo y recuperar su SHA actual antes de actualizarlo mediante la API de GitHub.
- Realizar escrituras secuencialmente y usar el SHA nuevo para la siguiente modificación del mismo archivo.
- No afirmar que se han ejecutado pruebas, sincronizado Apps Script o desplegado la Web App si no se ha hecho realmente.
- Solicitar autorización antes de promover cambios a `main` o desplegar en producción.
