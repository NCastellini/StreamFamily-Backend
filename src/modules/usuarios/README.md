# Usuarios

Responsable: Román Strizzi. Base: `/api/v1/usuarios`.

## Contrato

- IDs iniciales 1–15; ID 1 administrador, IDs 2–15 clientes.
- Campos públicos: `id`, `nombre`, `apellido`, `email`, `username`, `rol`,
  `estado`, `creadoEn`.
- `passwordHash` existe en el modelo interno y en los mocks, nunca en las
  respuestas. Las contraseñas se procesan con bcrypt (costo 10).
- `email` y `username` son únicos y se normalizan a minúsculas.
- Los datos viven en memoria y se reinician al reiniciar el proceso.
- Estados: `activo`, `bloqueado` e `inactivo` (baja lógica).
- El enum `estado_usuario` del DER en `docs/` incluye los tres estados.

## Usuarios de prueba

Dominio de demostración: `streamfamily.example`. No se envía correo.

| ID  | Username        | Email                                | Password          | Rol     | Estado    |
| --- | --------------- | ------------------------------------ | ----------------- | ------- | --------- |
| 1   | lucia.fernandez | lucia.fernandez@streamfamily.example | `AdminDemo123!`   | admin   | activo    |
| 2   | martin.gomez    | martin.gomez@streamfamily.example    | `ClienteDemo123!` | cliente | activo    |
| 4   | diego.lopez     | diego.lopez@streamfamily.example     | `ClienteDemo123!` | cliente | bloqueado |

Los clientes 2–15 comparten la contraseña de demostración `ClienteDemo123!`.
El usuario 4 permite probar el rechazo de cuentas bloqueadas y el usuario 15
(`victoria.castro`) el de cuentas dadas de baja.

## Endpoints

| Método | Ruta relativa         | Resultado                         |
| ------ | --------------------- | --------------------------------- |
| GET    | `/`                   | Listado con `meta`                |
| GET    | `/:id`                | Detalle                           |
| POST   | `/`                   | Alta, 201                         |
| PUT    | `/:id`                | Actualización del perfil completo |
| PATCH  | `/:id`                | Actualización parcial del perfil  |
| PATCH  | `/:id/estado`         | Bloquear o reactivar              |
| POST   | `/:id/reset-password` | Simulación, 200 y `data: null`    |
| DELETE | `/:id`                | Baja lógica, 200                  |

Listado: `page=1&limit=10&sortBy=id&order=desc&q=texto`.
Filtros: `rol=admin|cliente`, `estado=activo|bloqueado|inactivo`.
`q` busca nombre, apellido y email. Límite máximo: 100.
Los filtros sin coincidencias devuelven una lista vacía.

POST:

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "email": "ana@streamfamily.example",
  "username": "ana.perez",
  "password": "ClienteDemo123!",
  "rol": "cliente",
  "estado": "activo"
}
```

En POST, `rol` y `estado` son opcionales y toman los valores del ejemplo.
El alta siempre es activa; enviar otro estado devuelve 400.
La contraseña requiere al menos 8 caracteres (sin contar espacios exteriores)
y como máximo 72 bytes UTF-8; se conserva exactamente al hashearla.

PUT exige `nombre`, `apellido`, `email`, `username` y `rol`.
PATCH acepta cualquier subconjunto no vacío de esos campos.
Para modificar estado: `{"estado":"bloqueado"}` en `PATCH /:id/estado`.
Se rechazan campos desconocidos o internos (`id`, `passwordHash`, `creadoEn`).
Errores: 400 para datos inválidos, 404 para ID inexistente y 409 para duplicados.

DELETE conserva el registro y cambia su estado a `inactivo`. GET sigue
devolviéndolo y el listado permite encontrarlo con `estado=inactivo`.
Repetir DELETE mantiene el estado y devuelve 200. Email y username siguen
reservados, los IDs no se reutilizan y las referencias externas se conservan.
El endpoint de estado solo permite `activo` o `bloqueado`; sobre un usuario
inactivo devuelve 409 con el mensaje `El usuario está dado de baja`.
PUT y PATCH del perfil no pueden cambiar el estado. La baja no modifica
grupos, suscripciones ni alertas: su tratamiento se acordará al integrar.

## Integración con Auth

`verifyCredentials(identifier, password)` acepta email o username y devuelve
el usuario público o `null`. Rechaza contraseñas incorrectas y usuarios
bloqueados o inactivos. Auth usa este servicio, sin importar el mock.
`getById(id)` también acepta IDs numéricos para los consumidores internos.

Auth emite el JWT mediante el trabajo de Nazareno. Todas las rutas de Usuarios
aplican `verifyToken` y `requireRole('admin')` del middleware compartido.
Sin JWT válido devuelven 401; con rol cliente devuelven 403.
Las pruebas del módulo obtienen el token mediante el login real.

## Reset de contraseña: simulación de la etapa actual

`POST /:id/reset-password` es una simulación permitida para esta etapa,
no un restablecimiento funcional ni un flujo de recuperación completo.

- Comprueba que el usuario exista; si no existe, devuelve 404.
- No requiere ni procesa `nuevaPassword`.
- Devuelve 200 con `msg: 'Solicitud de restablecimiento simulada'` y `data: null`.
- No modifica la contraseña, su hash ni el estado de la cuenta.
- La contraseña anterior sigue siendo válida si la cuenta está activa.
- No genera tokens de recuperación ni envía correos.
- No devuelve contraseñas ni hashes.

**Fuera del alcance del prototipo; evolución futura de la propuesta original:**
definir e implementar el restablecimiento efectivo con Auth, sus validaciones,
autorización y pruebas. Queda por acordar también el tratamiento de cuentas
inactivas. La propuesta de recibir `nuevaPassword` y rechazar cuentas inactivas
con 409 no se implementó ni forma parte del contrato de esta simulación.

Las pruebas actuales comprueban la simulación; no acreditan que la recuperación
funcional de contraseñas esté terminada.

## Verificación

```bash
node --import tsx --test src/modules/usuarios/usuarios.test.ts
```

Integrar esta documentación y las credenciales en el README general durante
el PR de documentación final.
