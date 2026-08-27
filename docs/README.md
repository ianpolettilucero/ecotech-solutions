# Documentación — Sistema de Gestión Interna de EcoTech Solutions

Esta carpeta contiene el análisis, el diseño y la referencia técnica completa del
sistema. Los cuatro primeros documentos son el trabajo de análisis y modelado; el
resto documenta la implementación y la operación.

## Análisis y diseño

| Documento | Contenido |
|---|---|
| [01 — Análisis desde la POO](01-analisis-poo.md) | Traducción de los problemas de la empresa a requisitos técnicos, identificación de entidades del dominio y aplicación de los cuatro fundamentos de la orientación a objetos |
| [02 — Evaluación crítica de propuestas, incluidas las generadas con IA](02-evaluacion-critica-ia.md) | Tres modelos preliminares con sus diagramas, veinticuatro errores identificados y su corrección; patrones de fallo recurrentes de la asistencia automática en modelado |
| [03 — Modelo estructural UML](03-modelo-uml.md) | Diagrama de clases final, catálogo de clases, relaciones y multiplicidades, jerarquías de reportes, validación y errores, máquinas de estados y diagramas de secuencia |
| [04 — Justificación técnica del diseño](04-justificacion-diseno.md) | Quince decisiones de diseño con su alternativa descartada y la consecuencia de haber elegido mal |

## Implementación

| Documento | Contenido |
|---|---|
| [05 — Arquitectura](05-arquitectura.md) | Capas, regla de dependencia, ciclo de vida de una petición, inyección de dependencias, compilación y despliegue |
| [06 — Seguridad](06-seguridad.md) | Modelo de amenazas, autenticación, matriz RBAC completa, cifrado de datos personales, validación de entrada, defensa anti-CSRF, cabeceras y limitaciones conocidas |
| [07 — Referencia de la API](07-api.md) | Todos los endpoints con su permiso, parámetros, cuerpo, respuesta y errores; ejemplos con `curl` |
| [08 — Modelo de datos sobre Workers KV](08-modelo-datos-kv.md) | Mapa de claves, esquema de cada colección, consistencia eventual e integridad referencial |

## Uso y operación

| Documento | Contenido |
|---|---|
| [09 — Manual de usuario](09-manual-usuario.md) | Guía por rol y por módulo, circuito de aprobación de horas y preguntas frecuentes |
| [10 — Despliegue](10-despliegue.md) | Configuración de Cloudflare, namespace KV, secrets obligatorios, despliegue y operación |
| [11 — Pruebas](11-pruebas.md) | Cómo se ejecutan, qué cubren, qué no cubren y plan de pruebas manuales |

## Recorridos sugeridos

**Para evaluar el trabajo de análisis y modelado:** 01 → 02 → 03 → 04.

**Para entender el código antes de tocarlo:** 05 → 03 → 08 → 07.

**Para desplegarlo:** 10 → 06 (apartado de secretos) → 11 (verificación).

**Para usarlo:** 09.
