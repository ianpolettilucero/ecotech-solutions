# 4. Justificación técnica de las decisiones de diseño

> Cada apartado plantea la decisión, la alternativa descartada y la consecuencia
> concreta de haber elegido mal. Varias de estas decisiones nacen de corregir
> errores detectados en las propuestas preliminares
> ([02-evaluacion-critica-ia.md](02-evaluacion-critica-ia.md)).

## Contenido

- [4.1. Por qué `Gerente` no hereda de `Empleado`](#41-por-qué-gerente-no-hereda-de-empleado)
- [4.2. Por qué `Usuario` no hereda de `Empleado`](#42-por-qué-usuario-no-hereda-de-empleado)
- [4.3. Por qué la herencia se usa para el tipo de contrato](#43-por-qué-la-herencia-se-usa-para-el-tipo-de-contrato)
- [4.4. Por qué `AsignacionProyecto` es una clase](#44-por-qué-asignacionproyecto-es-una-clase)
- [4.5. Por qué existe `Persona` habiendo una sola subclase](#45-por-qué-existe-persona-habiendo-una-sola-subclase)
- [4.6. Por qué las relaciones se guardan como identificadores](#46-por-qué-las-relaciones-se-guardan-como-identificadores)
- [4.7. Por qué las bajas son lógicas](#47-por-qué-las-bajas-son-lógicas)
- [4.8. Por qué las fábricas viven en módulos aparte](#48-por-qué-las-fábricas-viven-en-módulos-aparte)
- [4.9. Por qué un método plantilla para los informes](#49-por-qué-un-método-plantilla-para-los-informes)
- [4.10. Por qué el cifrado no está en la entidad](#410-por-qué-el-cifrado-no-está-en-la-entidad)
- [4.11. Por qué la validación es una jerarquía de objetos](#411-por-qué-la-validación-es-una-jerarquía-de-objetos)
- [4.12. Por qué sesiones opacas y no JWT](#412-por-qué-sesiones-opacas-y-no-jwt)
- [4.13. Por qué un almacén clave-valor y no una base relacional](#413-por-qué-un-almacén-clave-valor-y-no-una-base-relacional)
- [4.14. Por qué un cliente sin framework](#414-por-qué-un-cliente-sin-framework)
- [4.15. Decisiones que se revisarían con más volumen](#415-decisiones-que-se-revisarían-con-más-volumen)

---

## 4.1. Por qué `Gerente` no hereda de `Empleado`

**Decisión.** La gerencia se modela como la asociación
`Departamento.gerenteId → Empleado`.

**Alternativa descartada.** `class Gerente extends Empleado`, que es lo que
proponían dos de los tres modelos preliminares.

**Razonamiento.** La herencia expresa "es un" de forma permanente: un objeto no
cambia de clase durante su vida. Ser gerente es un cargo que se ocupa y se deja.

Con herencia, ascender a alguien obliga a construir un `Gerente` nuevo y destruir
el `Empleado` anterior. Como la identidad es el `id`, eso significa perder el
vínculo con sus horas cargadas, sus asignaciones y su historial de auditoría, o
bien copiar el `id` al objeto nuevo, que es peor: dos objetos de clases distintas
con la misma identidad. Degradarlo exige la operación inversa. Un ciclo de
ascenso y descenso deja el sistema en un estado que ninguna transacción explica.

Hay un segundo problema, menos visible: la herencia no puede expresar la
cardinalidad real. Nada impediría que existiera un `Gerente` que no dirige ningún
departamento, ni que dos objetos `Gerente` reclamaran el mismo. La asociación sí
lo expresa: `Departamento` tiene como mucho un gerente, y el puesto puede estar
vacante (`0..1`).

**Prueba de la decisión.** La pregunta "tras el cambio, ¿sigue siendo la misma
persona con el mismo legajo y el mismo historial?" tiene respuesta afirmativa. La
herencia no puede representar eso; la asociación sí.

**Consecuencia en el código.** `Departamento.liberarSiEsGerente(empleadoId)`
permite que la baja de un empleado deje el puesto vacante sin dejar una
referencia colgada. Con herencia, ese caso ni siquiera es expresable.

---

## 4.2. Por qué `Usuario` no hereda de `Empleado`

**Decisión.** Dos entidades separadas, con asociación opcional `0..1` en ambos
sentidos (`Usuario.empleadoId`).

**Alternativa descartada.** `class Usuario extends Empleado`, con el argumento de
que "un usuario es un empleado que entra al sistema".

**Razonamiento.** La jerarquía rompe por los dos extremos:

- **Empleados sin usuario.** Un operario de campo al que su supervisor le carga
  las horas cobra, tiene legajo y aparece en la nómina, pero nunca inicia sesión.
  Con herencia habría que inventarle credenciales, que es crear una cuenta activa
  que nadie vigila.
- **Usuarios sin empleado.** La cuenta del auditor externo y la cuenta técnica de
  administración no corresponden a nadie en nómina. Con herencia habría que
  inventarles legajo, fecha de contrato y salario, y ensuciarían todos los
  informes de personal.

Los ciclos de vida también son independientes: dar de baja a alguien de la
empresa debe desactivar su cuenta, pero eliminar una cuenta no borra a la
persona.

**Consecuencia en el código.** `ServicioEmpleados.eliminar` desactiva en cascada
el usuario vinculado, si lo hay. Es una regla explícita en un sitio concreto, en
lugar de un efecto implícito de la jerarquía.

---

## 4.3. Por qué la herencia se usa para el tipo de contrato

**Decisión.** `Empleado` abstracta con `calcularRemuneracionMensual()` abstracto,
y tres subclases: `EmpleadoAsalariado`, `EmpleadoPorHoras`, `Contratista`.

**Alternativa descartada.** Una sola clase con un campo `tipoContrato` y un
`switch` dentro del cálculo.

**Razonamiento.** Aquí la herencia sí corresponde: la modalidad de contrato **no
cambia** durante la vida del vínculo laboral. Pasar de jornalizado a asalariado es
un contrato nuevo, y el sistema lo trata como tal
(`ServicioEmpleados.actualizar` rechaza explícitamente el cambio de
`tipoContrato` y explica que hay que dar de baja y alta).

Con `switch`, ese condicional no se queda en un sitio. Reaparece en el generador
de nómina, en el validador de altas (¿qué campos económicos son obligatorios?) y
en los informes. Cada modalidad nueva obliga a encontrar y modificar todos esos
puntos, y el que se olvide produce un error de cálculo **silencioso**: un
empleado con remuneración cero pasa inadvertido hasta que reclama. Es exactamente
la clase de fallo que la empresa ya sufre con las hojas de cálculo.

**Verificación.** El informe de nómina recorre la plantilla sin un solo
condicional sobre el tipo:

```ts
const remuneracion = empleado.calcularRemuneracionMensual(horasAprobadas);
```

Y hay una prueba que lo fija (`tests/dominio.test.ts`): tres empleados de tipos
distintos liquidados en un mismo `reduce`, con tres resultados distintos y cero
`if`.

**Contrapartida asumida.** La subclase se elige al leer del almacén, así que hace
falta una fábrica (`FabricaEmpleados.rehidratar`) y un discriminante persistido.
Es un `switch`, sí, pero **uno solo**, en un lugar conocido, cuya omisión rompe
de forma ruidosa en vez de silenciosa.

---

## 4.4. Por qué `AsignacionProyecto` es una clase

**Decisión.** Clase de asociación con identidad propia entre `Empleado` y
`Proyecto`.

**Alternativa descartada.** Una asociación `*..*` directa, o un array
`Empleado.proyectos: string[]`.

**Razonamiento.** El vínculo tiene cuatro atributos que no pertenecen a ninguno
de los dos extremos: rol en el proyecto, porcentaje de dedicación, fecha de alta
y fecha de baja de la participación. Un array de identificadores no tiene dónde
guardarlos.

De la existencia de esa clase se derivan tres capacidades que el enunciado pide:

1. **Validar la asignación.** `ServicioAsignaciones` puede exigir que la suma de
   dedicaciones activas de un empleado no supere el 100 %, porque hay objetos que
   sumar. Ese es el mecanismo concreto contra los "errores en la asignación de
   personal a proyectos".
2. **Conservar el histórico.** Desasignar cierra la fila con
   `fechaDesasignacion` en lugar de borrarla. Las horas cargadas durante ese
   período siguen teniendo un vínculo que las explica.
3. **Validar la imputación de horas.** `estabaVigenteEn(fecha)` permite rechazar
   un parte de horas de un día en el que la persona no participaba en ese
   proyecto. Sin la fecha de alta, esa comprobación es imposible.

**Detalle que suele faltar.** El modelo preliminar C incluía la clase intermedia
pero sin fechas, y con eso perdía las capacidades 2 y 3, que son justamente las
que sostienen la trazabilidad.

---

## 4.5. Por qué existe `Persona` habiendo una sola subclase

**Decisión.** `Persona` abstracta entre `Entidad` y `Empleado`.

**Objeción legítima.** Un nivel de herencia con un único descendiente suele ser
abstracción especulativa, y el principio de "no lo vas a necesitar" recomienda
eliminarlo.

**Razonamiento para conservarlo.** No se introdujo para prever subclases futuras,
sino para **separar dos conjuntos de reglas que hoy ya son distintos**:

- Lo que hace de alguien una *persona* —identidad, contacto, domicilio— está
  sujeto a normativa de datos personales: se cifra en reposo, se enmascara según
  permisos y su acceso se audita.
- Lo que hace de alguien un *empleado* —legajo, contrato, remuneración,
  departamento— es información laboral, con otro ciclo de vida.

Concentrar el bloque cifrado y los índices ciegos en `Persona` hace que la
protección venga **heredada y no repetida**. Una subclase futura no puede
"olvidarse" de proteger los datos, porque no tiene forma de declararlos sin
pasar por el mecanismo.

**Criterio aplicado.** La abstracción se justifica cuando agrupa un conjunto
coherente de reglas, no cuando anticipa clases hipotéticas. Si `Persona` solo
tuviera `nombre` y `apellido`, sobraría.

---

## 4.6. Por qué las relaciones se guardan como identificadores

**Decisión.** `Departamento` guarda `gerenteId: string | null`, no
`gerente: Empleado`.

**Alternativa descartada.** Referencias directas a objetos.

**Razonamiento.** Tres motivos, en orden de peso:

1. **Serialización.** Con referencias directas, `Departamento → Empleado →`
   (por su departamento) `→ Departamento` produce un ciclo que `JSON.stringify`
   no puede resolver.
2. **Amplificación de escrituras.** Si el departamento contuviera el objeto
   empleado, cambiar el teléfono de un empleado obligaría a reescribir todos los
   departamentos que lo referencian.
3. **Encaje con el almacén.** Cada colección se guarda por separado en KV. Las
   referencias por identificador son la representación natural.

**Contrapartida asumida y cómo se gestiona.** La integridad referencial no la
garantiza el modelo: en un almacén clave-valor no hay claves foráneas. La
imponen los servicios, que comprueban que el identificador exista y apunte a una
entidad activa antes de guardar. Es una regla explícita y, por tanto,
comprobable; el precio es que hay que acordarse de escribirla en cada punto,
y por eso está documentada endpoint por endpoint en
[08-modelo-datos-kv.md](08-modelo-datos-kv.md).

---

## 4.7. Por qué las bajas son lógicas

**Decisión.** `Empleado.desactivar()` y `Departamento.desactivar()` marcan
`activo = false`. El borrado físico solo existe para registros de tiempo en
borrador y para proyectos sin ninguna hora ni asignación asociada.

**Alternativa descartada.** `DELETE` real, con o sin borrado en cascada.

**Razonamiento.** Borrar un empleado dejaría huérfanos sus registros de tiempo y
sus asignaciones. Peor que el dato huérfano es la consecuencia contable: los
informes de períodos ya cerrados cambiarían retroactivamente, porque las horas de
esa persona desaparecerían del total. Un informe que da un resultado distinto
según cuándo se pida no sirve para nada, y el enunciado señala precisamente los
"problemas en la generación de reportes confiables".

El borrado en cascada es todavía peor: borrar a alguien eliminaría en silencio su
historial de horas.

**Efectos en cascada que sí ocurren, y son explícitos.** Al dar de baja a un
empleado, `ServicioEmpleados.eliminar` libera la gerencia de cualquier
departamento que dirigiera, cierra sus asignaciones activas con fecha de hoy y
desactiva su usuario vinculado. Son tres reglas escritas y auditadas, no un
efecto implícito de la base de datos.

**Excepción razonada.** Un registro de tiempo en `BORRADOR` nunca computó en
ningún informe ni en ninguna nómina, así que borrarlo no altera ningún histórico.

---

## 4.8. Por qué las fábricas viven en módulos aparte

**Decisión.** `FabricaExportadores` es un módulo propio, no un método estático de
`Exportador`.

**Razonamiento.** No es preferencia estilística: la primera versión ponía
`Exportador.crear()` dentro de la clase base y **fallaba en tiempo de carga**.

En módulos ES, la cláusula `extends` se evalúa cuando se ejecuta el cuerpo del
módulo, no cuando se instancia la clase. Si la base importa a sus subclases y
las subclases importan a la base, el grafo es cíclico. Al entrar por la base, las
subclases se evalúan mientras el binding `Exportador` sigue en su zona muerta
temporal, y el programa aborta con `Cannot access 'Exportador' before
initialization`.

```
  Ciclo (falla):        base <--> subclases
  Árbol (funciona):     base <-- subclases <-- fábrica
```

Separar la fábrica convierte el ciclo en un árbol. Y de paso respeta la
responsabilidad única: una abstracción no tiene por qué conocer el catálogo de
sus implementaciones.

`FabricaEmpleados` sigue el mismo patrón y por la misma razón: rehidratar la
subclase correcta a partir del estado persistido es un `switch`, pero **uno
solo**, en un módulo que depende de las tres subclases sin que ninguna dependa de
él.

**Un segundo idioma, en los informes.** `Reporte.crear()` resuelve el mismo
problema de otra forma: conserva la fábrica dentro de la clase base, y cada
subclase exporta una función constructora que **declara su clase en la primera
llamada** en lugar de en el cuerpo del módulo. Al cargarse, el módulo de la
subclase no toca la base, así que el ciclo deja de importar; cuando la fábrica
invoca la función, ya en tiempo de ejecución, la jerarquía está completa.

Las dos soluciones son correctas y ambas están verificadas. Se diferencian en el
compromiso:

| | Módulo de fábrica aparte | Clase declarada de forma perezosa |
|---|---|---|
| Dónde vive el `switch` | Módulo propio | Clase base |
| Grafo de módulos | Árbol, sin ciclo | Sigue habiendo ciclo, pero inofensivo |
| Legibilidad | La subclase es una declaración normal | Exige entender por qué la clase está dentro de una función |
| Riesgo de regresión | Bajo | Alto: mover la clase al cuerpo del módulo reintroduce el fallo |

Que convivan los dos idiomas es una inconsistencia real del código, asumida a
conciencia: unificarlos obligaría a reescribir cinco archivos que funcionan y
están probados, a cambio de una mejora de estilo. Si el proyecto continuara,
`Reporte` se alinearía con el patrón de `FabricaExportadores`, que es el más
legible y el más difícil de romper por accidente.

**Nota de método.** Este fallo no lo detectó ni el compilador ni la revisión de
código: apareció al ejecutar los exportadores contra datos reales, con el
mensaje `Cannot access 'Exportador' before initialization` en tiempo de carga. Es
un argumento a favor de ejercitar el código además de leerlo, y la razón de que
`tests/exportadores.test.ts` cargue de verdad las cuatro clases a través de la
fábrica.

---

## 4.9. Por qué un método plantilla para los informes

**Decisión.** `Reporte.generar()` concreto en la clase base, con
`columnas`, `construirFilas` y `calcularTotales` abstractos.

**Alternativa descartada.** `generar()` abstracto, con cada subclase montando el
`ReporteDTO` completo.

**Razonamiento.** Con `generar()` abstracto, cada subclase repite el mismo
ensamblado (título, descripción, fecha de generación, autor, columnas, filas,
totales). Cinco copias de la misma estructura significan cinco sitios donde
olvidarse de un campo nuevo, y ese olvido produce un informe incompleto que nadie
detecta hasta que alguien lo lee.

Con el método plantilla, la forma del informe está escrita una sola vez y las
subclases solo aportan lo que las distingue.

**Combinación con la fábrica de exportadores.** Los dos ejes —qué informe y en
qué formato— son independientes, y el servicio los combina sin condicionales:

```ts
const reporte = Reporte.crear(tipo).generar(datos);
const bytes = await FabricaExportadores.crear(formato).exportar(reporte);
```

Veinte combinaciones servidas por nueve clases pequeñas. La alternativa de un
método por combinación (`generarNominaPDF()`, `generarNominaExcel()`, …) crece de
forma multiplicativa.

**Detalle deliberado.** Los informes reciben los datos personales ya descifrados
—o un mapa vacío si el rol no tiene permiso— en lugar de consultarlos ellos
mismos. Así el **mismo** informe sirve para Recursos Humanos y para gerencia, con
los datos enmascarados en el segundo caso, sin necesidad de dos clases.

---

## 4.10. Por qué el cifrado no está en la entidad

**Decisión.** `Persona` guarda un `SobreCifrado` opaco. Cifrar y descifrar es
responsabilidad de `ServicioCripto`, invocado desde la capa de servicio.

**Alternativa descartada.** Que `Persona` cifre y descifre en sus propios
accesores.

**Razonamiento.** Tres consecuencias, todas malas:

1. **La entidad se vuelve asíncrona.** WebCrypto es asíncrono, así que
   `persona.getDocumento()` devolvería una promesa. Todo el dominio se contagia y
   deja de poder razonarse de forma directa.
2. **La entidad necesita la clave.** Habría que inyectarle material
   criptográfico, con lo que dejaría de ser un objeto de dominio puro y no se
   podría instanciar en una prueba sin montar la criptografía.
3. **Se pierde el control de acceso.** Si descifrar es transparente, cualquier
   punto del código que tenga la entidad tiene el dato en claro. Con el sobre
   opaco, descifrar es una acción explícita y visible, y el servicio puede
   condicionarla al permiso `empleado:leer_sensible`.

**Resultado.** La entidad sigue siendo síncrona y comprobable sin criptografía, y
cada descifrado es una línea localizable en una búsqueda del código.

---

## 4.11. Por qué la validación es una jerarquía de objetos

**Decisión.** `Regla` abstracta con implementaciones por tipo de dato, compuestas
en un `Esquema` declarativo.

**Alternativa descartada.** Funciones sueltas de validación, o comprobaciones
`if` dentro de cada servicio.

**Razonamiento.** El polimorfismo hace que el `Esquema` recorra las reglas sin
saber cuál está ejecutando. Añadir una `ReglaCUIT` no obliga a tocar ni el
esquema ni el enrutador.

Pero el valor mayor está en tres decisiones del `Esquema`, no en la jerarquía:

1. **Lista blanca estricta.** Cualquier propiedad no declarada se **rechaza**, no
   se ignora. Eso cierra la asignación masiva: sin ello, un empleado podría
   ascenderse enviando `{"rol": "ADMIN_RRHH"}` al editar su propio perfil.
   Ignorar el campo sobrante sería casi tan seguro, pero rechazarlo convierte un
   intento de ataque en un error visible y auditable.
2. **Acumulación de fallos.** Se recogen todos antes de responder, para que el
   formulario marque todos los campos de una vez en lugar de uno por intento.
3. **Rechazo de claves peligrosas.** `__proto__`, `constructor` y `prototype` se
   rechazan de forma explícita, y el objeto de salida se construye con
   `Object.create(null)`, para cerrar la contaminación de prototipos.

**Decisión de fondo sobre el escape de HTML.** Las reglas **no** escapan HTML.
Escapar en la entrada corrompe el dato almacenado y produce el clásico
`Jos&eacute;` guardado en el sistema. El escape corresponde al punto de salida: el
cliente pinta siempre con `textContent` y no usa `innerHTML` en ningún sitio. Lo
que sí se elimina en la entrada son los caracteres de control, que no son
representables y sí son vehículo de inyección en logs y cabeceras.

---

## 4.12. Por qué sesiones opacas y no JWT

**Decisión.** Token aleatorio de 256 bits; en KV se guarda su **hash** SHA-256
junto con los datos de la sesión y un TTL de ocho horas.

**Alternativa descartada.** JWT firmado, sin estado en el servidor.

**Razonamiento.** Un JWT no se puede revocar antes de que expire. Si se despide a
alguien o se le cambia el rol, su token sigue siendo válido hasta el vencimiento.
Para un sistema cuyo requisito explícito es que "los usuarios solo tengan acceso a
los módulos para los que están autorizados", eso es un fallo de diseño: la única
mitigación sería reducir la vigencia a minutos y añadir refresco, que es más
maquinaria que la que se ahorra.

Con una sesión en KV, borrar la clave corta el acceso al instante. Y el sistema va
más lejos: en cada petición se revalida el rol contra el usuario real, de modo que
un cambio de rol surte efecto en la petición siguiente sin necesidad de cerrar
sesión.

**Por qué se guarda el hash y no el token.** Un volcado del almacén no permite
suplantar a nadie: quien lo obtuviera tendría que invertir SHA-256. Es la misma
lógica que aplicar a las contraseñas, aplicada a las sesiones.

**Coste asumido.** Una lectura de KV por petición autenticada. Se amortiza con la
caché de isolate de `AlmacenKV`.

---

## 4.13. Por qué un almacén clave-valor y no una base relacional

**Decisión.** Workers KV, con un documento JSON por colección.

**Contexto.** Fue un requisito del encargo desplegar sin base de datos. El
apartado documenta las consecuencias reales de esa restricción, no la defiende
como si fuera óptima para todo caso.

**Lo que se gana.** Cero infraestructura que administrar, latencia baja en el
borde, coste nulo en el plan gratuito, y ninguna migración que ejecutar en un
entorno que no tiene paso de post-despliegue.

**Lo que se pierde, sin adornos.**

| Capacidad | Estado |
|---|---|
| Claves foráneas | No existen; la integridad la imponen los servicios |
| Transacciones multi-documento | No existen; una operación que toca dos colecciones puede quedar a medias |
| Consultas por atributo | Se filtra en memoria tras leer la colección entera |
| Escrituras concurrentes | "El último en escribir gana" dentro de una misma colección |
| Consistencia | Eventual entre centros de datos |

**Por qué un documento por colección y no una clave por registro.** KV cobra y
limita por operación. Listar doscientos empleados con una clave por empleado
costaría una operación `list` más doscientas lecturas; con un documento por
colección cuesta **una**. El límite duro es de 25 MiB por valor, del orden de
decenas de miles de registros, holgado para una empresa mediana.

**Cómo se mitiga la consistencia eventual.** Dos medidas: `AlmacenKV` mantiene una
caché de escritura directa por isolate, de modo que tras escribir las lecturas
siguientes ven el valor nuevo; y las mutaciones de la API devuelven la entidad ya
actualizada, para que el cliente no tenga que releer. El usuario no ve
desaparecer su propia escritura.

**Cuándo dejaría de servir.** En cuanto hagan falta transacciones reales, informes
sobre cientos de miles de partes de horas, o escritura concurrente intensa sobre
la misma colección. La frontera `Repositorio<T>` existe precisamente para que ese
cambio no toque el dominio.

---

## 4.14. Por qué un cliente sin framework

**Decisión.** SPA en TypeScript con clases propias, empaquetada con esbuild. Cero
dependencias en tiempo de ejecución.

**Alternativa descartada.** React, Vue o similar.

**Razonamiento.** Tres motivos:

1. **Tamaño y superficie.** El Worker tiene un límite duro de tamaño. Cada
   dependencia añade peso y superficie de ataque, y este cliente no necesita
   reconciliación de árbol virtual: son formularios y tablas.
2. **Coherencia con el trabajo.** El cliente aplica la misma estructura que el
   servidor: `Vista` es una clase abstracta y el armazón trabaja contra ella sin
   conocer ninguna pantalla concreta. El menú se construye solo, filtrando por los
   permisos que cada vista declara. Añadir un módulo es escribir una clase y
   sumarla a una lista.
3. **La restricción de seguridad se vuelve estructural.** La política de
   contenido prohíbe `unsafe-inline`, y el cliente no usa `innerHTML` en ningún
   sitio: todo el DOM se construye con ayudantes que escriben `textContent`. No
   tener el método peligroso a mano hace que el olvido sea imposible, en lugar de
   confiar en que nadie se olvide de escapar.

**Contrapartida.** Más código de manipulación de DOM del que haría falta con un
framework, y sin las herramientas de desarrollo del ecosistema.

**Aviso sobre el control de acceso del cliente.** Que una vista declare permisos
sirve para no mostrar botones que no van a funcionar. **No es seguridad**: el
servidor vuelve a comprobarlo todo. Ocultar un botón evita confundir al usuario,
no detiene a un atacante.

---

## 4.15. Decisiones que se revisarían con más volumen

Ninguna decisión es correcta en abstracto. Estas dependen del tamaño y cambiarían
si el sistema creciera:

| Decisión | Umbral en el que deja de servir | Sustituto |
|---|---|---|
| Un documento por colección | Decenas de miles de registros, o escritura concurrente intensa | Una clave por registro con índices, o D1 |
| Filtrado en memoria | Colecciones que no quepan cómodamente en una lectura | Índices secundarios o SQL |
| Auditoría recortada a los 2.000 asientos más recientes | Cualquier exigencia de retención legal | Volcado periódico a R2 |
| Sesiones con TTL de 8 horas | Necesidad de sesiones largas con refresco | Token de refresco con rotación |
| Roles fijos en código | Necesidad de que el cliente defina roles propios | Permisos como datos, con su CRUD |
| Sin rotación de clave de cifrado | Cualquier política de rotación obligatoria | Descifrar y volver a cifrar por lotes, aprovechando el campo `v` del sobre |

El campo `v` del sobre cifrado y la abstracción `Repositorio<T>` están puestos
precisamente para que dos de estos cambios no obliguen a reescribir el dominio.

---

**Anterior:** [3. Modelo UML](03-modelo-uml.md) · **Siguiente:** [5. Arquitectura](05-arquitectura.md)
