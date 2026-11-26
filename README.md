# StreamFamily-Backend

API REST de **StreamFamily**, gestor de suscripciones de plataformas de streaming (Grupo 15).

Node.js + Express + TypeScript. En esta etapa los datos están mockeados: viven en memoria y se reinician cada vez que se reinicia el servidor.

## URLs

| Entorno    | URL                                                     |
| ---------- | ------------------------------------------------------- |
| Producción | https://streamfamily-backend.onrender.com/api/v1        |
| Local      | http://localhost:3000/api/v1                            |
| Health     | https://streamfamily-backend.onrender.com/api/v1/health |

> El backend está en el plan gratuito de Render: si no recibe peticiones durante 15 minutos se suspende, y la primera petición siguiente puede tardar unos 50 segundos.

## Cómo levantarlo localmente

**Requisitos:** Node.js 22.

```bash
git clone https://github.com/NCastellini/StreamFamily-Backend.git
cd StreamFamily-Backend
npm ci
cp sample.env .env    # en Windows (PowerShell): copy sample.env .env
npm run dev
```

La API queda en `http://localhost:3000/api/v1`. Para comprobar que está viva:

```bash
curl http://localhost:3000/api/v1/health
```

## Variables de entorno

Se definen en `.env` (no se sube al repo). La plantilla está en `sample.env`.

| Variable      | Descripción                             |
| ------------- | --------------------------------------- |
| `PORT`        | Puerto del servidor (por defecto 3000)  |
| `NODE_ENV`    | `development`, `production` o `test`    |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma |
| `JWT_SECRET`  | Secreto para firmar los tokens          |

En producción (`NODE_ENV=production`) las tres últimas son obligatorias: `CORS_ORIGIN` no puede ser `*` y `JWT_SECRET` debe tener al menos 32 caracteres.

## Scripts

| Comando                | Qué hace                                   |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Desarrollo con recarga automática          |
| `npm run build`        | Compila TypeScript a `dist/`               |
| `npm start`            | Ejecuta la versión compilada               |
| `npm run lint`         | Revisa el código con ESLint                |
| `npm run lint:fix`     | Corrige automáticamente lo que pueda       |
| `npm run format`       | Formatea todo con Prettier                 |
| `npm run format:check` | Verifica el formato sin modificar archivos |

## Deploy

Render (Web Service) desde la rama `main`, con auto-deploy en cada commit.

- **Build:** `npm ci --include=dev && npm run build`
- **Start:** `npm run start`
- **Health check:** `/api/v1/health`
- **Variables:** `NODE_ENV=production`, `JWT_SECRET` y `CORS_ORIGIN`.

Flujo de ramas: cada integrante trabaja en `feat/<apellido>-<modulo>` → PR a `dev` → PR de `dev` a `main` para publicar.

## Formato de las respuestas

Todas las respuestas tienen la forma `{ msg, code, data }`. Los listados agregan `meta` con el paginado:

```json
{
  "msg": "Ok",
  "code": 200,
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 30, "totalPages": 3 }
}
```

Los listados aceptan `page`, `limit` (máx. 100), `sortBy`, `order` (`asc` | `desc`), `q` (búsqueda de texto) y filtros propios de cada módulo.

| Código | Significado                                            |
| ------ | ------------------------------------------------------ |
| 400    | Datos inválidos (body, query o id)                     |
| 401    | Falta el token o es inválido                           |
| 403    | El usuario no tiene permiso (por ejemplo, no es admin) |
| 404    | El recurso o la ruta no existe                         |
| 409    | Conflicto (duplicado, estado repetido, recurso en uso) |
| 422    | Una referencia a otro recurso no es válida             |

## Autenticación

Las rutas, salvo `/health` y las de `/auth` (menos `/auth/me`), requieren un token JWT:

1. `POST /api/v1/auth/login` con `username` (o `email`) y `password`.
2. La respuesta trae `data.token`.
3. En cada petición: header `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lucia.fernandez","password":"AdminDemo123!"}'
```

Hay dos roles: `admin` y `cliente`. Las rutas marcadas como **admin** devuelven 403 a un cliente.

### Usuarios de prueba

| Username          | Password          | Rol     | Para probar                         |
| ----------------- | ----------------- | ------- | ----------------------------------- |
| `lucia.fernandez` | `AdminDemo123!`   | admin   | Acceso completo                     |
| `martin.gomez`    | `ClienteDemo123!` | cliente | Uso normal                          |
| `diego.lopez`     | `ClienteDemo123!` | cliente | Cuenta bloqueada (rechaza el login) |

Los clientes 2 a 15 comparten la contraseña `ClienteDemo123!`. Más detalle en [`src/modules/usuarios/README.md`](src/modules/usuarios/README.md).

## Endpoints

Base: `/api/v1`. **Acceso:** 🔓 público · 🔑 con token · 👑 solo admin.

### Auth · `/auth`

| Método | Ruta        | Acceso | Descripción                       |
| ------ | ----------- | ------ | --------------------------------- |
| POST   | `/login`    | 🔓     | Inicia sesión y devuelve el token |
| POST   | `/register` | 🔓     | Registro (simulado)               |
| POST   | `/recover`  | 🔓     | Recuperar contraseña (simulado)   |
| GET    | `/me`       | 🔑     | Datos del usuario del token       |

### Usuarios · `/usuarios`

| Método | Ruta                  | Acceso | Descripción                     |
| ------ | --------------------- | ------ | ------------------------------- |
| GET    | `/`                   | 👑     | Lista paginada                  |
| GET    | `/:id`                | 👑     | Detalle                         |
| POST   | `/`                   | 👑     | Alta                            |
| PUT    | `/:id`                | 👑     | Reemplazo                       |
| PATCH  | `/:id`                | 👑     | Modificación parcial            |
| PATCH  | `/:id/estado`         | 👑     | Activar, bloquear o dar de baja |
| POST   | `/:id/reset-password` | 👑     | Resetear contraseña (simulado)  |
| DELETE | `/:id`                | 👑     | Baja                            |

### Categorías · `/categorias`

| Método | Ruta   | Acceso | Descripción                                 |
| ------ | ------ | ------ | ------------------------------------------- |
| GET    | `/`    | 🔑     | Lista paginada                              |
| GET    | `/:id` | 🔑     | Detalle                                     |
| POST   | `/`    | 👑     | Alta                                        |
| PUT    | `/:id` | 👑     | Reemplazo                                   |
| PATCH  | `/:id` | 👑     | Modificación parcial                        |
| DELETE | `/:id` | 👑     | Baja (409 si tiene suscripciones asociadas) |

### Suscripciones · `/suscripciones`

| Método | Ruta          | Acceso | Descripción                                       |
| ------ | ------------- | ------ | ------------------------------------------------- |
| GET    | `/`           | 🔑     | Lista paginada                                    |
| GET    | `/:id`        | 🔑     | Detalle                                           |
| POST   | `/`           | 🔑     | Alta                                              |
| PUT    | `/:id`        | 🔑     | Reemplazo                                         |
| PATCH  | `/:id`        | 🔑     | Modificación parcial                              |
| PATCH  | `/:id/estado` | 🔑     | Cambiar estado: `activa`, `pausada` o `cancelada` |
| DELETE | `/:id`        | 🔑     | Baja                                              |

**Query de `GET /`:** `q` (plataforma y plan) y filtros `categoriaId`, `grupoId`, `usuarioId`, `medioPagoId`, `moneda` (`ARS` | `USD`), `frecuencia` (`mensual` | `trimestral` | `anual`) y `estado`.

**Body de POST / PUT** (`grupoId` es opcional o `null`; `estado` por defecto `activa`):

```json
{
  "plataforma": "Netflix",
  "plan": "Premium",
  "costo": 9999,
  "moneda": "ARS",
  "frecuencia": "mensual",
  "fechaCobro": "2026-12-10",
  "medioPagoId": 1,
  "categoriaId": 1,
  "usuarioId": 2,
  "grupoId": 1
}
```

Devuelve 400 si `medioPagoId`, `categoriaId`, `usuarioId` o `grupoId` no existen, y 409 si se cambia al estado que ya tiene.

### Medios de pago · `/medios-pago`

| Método | Ruta                 | Acceso | Descripción                                    |
| ------ | -------------------- | ------ | ---------------------------------------------- |
| GET    | `/`                  | 🔑     | Lista paginada (`q` por nombre, filtro `tipo`) |
| GET    | `/:id`               | 🔑     | Detalle                                        |
| GET    | `/:id/suscripciones` | 🔑     | Suscripciones que se pagan con ese medio       |
| POST   | `/`                  | 🔑     | Alta                                           |
| PUT    | `/:id`               | 🔑     | Reemplazo                                      |
| PATCH  | `/:id`               | 🔑     | Modificación parcial                           |
| DELETE | `/:id`               | 🔑     | Baja (409 si está en uso)                      |

`tipo`: `tarjeta_credito`, `tarjeta_debito`, `billetera` o `transferencia`. Nunca se guarda el número de tarjeta: `ultimosDigitos` acepta solo 4 dígitos o `null`.

### Grupos · `/grupos`

| Método | Ruta                    | Acceso | Descripción                        |
| ------ | ----------------------- | ------ | ---------------------------------- |
| GET    | `/`                     | 🔑     | Lista paginada                     |
| GET    | `/:id`                  | 🔑     | Detalle                            |
| GET    | `/:id/resumen`          | 🔑     | Gasto mensual del grupo por moneda |
| POST   | `/`                     | 🔑     | Alta                               |
| PUT    | `/:id`                  | 🔑     | Reemplazo                          |
| PATCH  | `/:id`                  | 🔑     | Modificación parcial               |
| DELETE | `/:id`                  | 🔑     | Baja                               |
| POST   | `/:id/miembros`         | 🔑     | Agregar un miembro                 |
| DELETE | `/:id/miembros/:userId` | 🔑     | Quitar un miembro                  |

### Pagos · `/pagos`

| Método | Ruta     | Acceso | Descripción                               |
| ------ | -------- | ------ | ----------------------------------------- |
| GET    | `/`      | 🔑     | Historial paginado                        |
| GET    | `/total` | 🔑     | Total pagado (opcional `?suscripcionId=`) |
| GET    | `/:id`   | 🔑     | Detalle                                   |
| POST   | `/`      | 🔑     | Registrar un pago                         |
| PUT    | `/:id`   | 🔑     | Reemplazo                                 |
| PATCH  | `/:id`   | 🔑     | Modificación parcial                      |
| DELETE | `/:id`   | 🔑     | Baja                                      |

### Dashboard · `/dashboard`

| Método | Ruta            | Acceso | Descripción                                          |
| ------ | --------------- | ------ | ---------------------------------------------------- |
| GET    | `/resumen`      | 🔑     | Gasto mensual y anual en ARS y suscripciones activas |
| GET    | `/categorias`   | 🔑     | Gasto mensual y porcentaje por categoría             |
| GET    | `/renovaciones` | 🔑     | Renovaciones próximas (`?dias=`, por defecto 30)     |

### Métricas · `/admin/metricas`

| Método | Ruta | Acceso | Descripción                                                                                  |
| ------ | ---- | ------ | -------------------------------------------------------------------------------------------- |
| GET    | `/`  | 👑     | Totales de usuarios y grupos, suscripciones activas, ranking de plataformas y gasto promedio |

Más detalle en [`src/modules/metricas/README.md`](src/modules/metricas/README.md).

### Alertas · `/alertas`

Ver la sección [Alertas](#alertas) más abajo.

## Moneda de presentación del prototipo

Dashboard y Métricas presentan sus resultados en **ARS**. Las suscripciones
pueden registrar costos en ARS o USD:

- Los importes en ARS se utilizan sin conversión.
- Los importes en USD se convierten con una cotización mock fija de
  **1 USD = 1200 ARS**, conservada para el prototipo en ambos módulos.
- Es un valor ficticio de demostración, no una cotización real ni actualizada
  automáticamente. Si cambia, debe actualizarse en ambos módulos.
- Para los indicadores mensuales, el costo trimestral se divide por 3 y el anual
  por 12; el mensual se utiliza sin dividir.

## Alertas

Avisos de vencimiento de suscripciones. Base: `/api/v1/alertas` · Datos en memoria (se reinician al reiniciar el servidor).

| Método | Ruta               | Descripción                                                                   | Éxito |
| ------ | ------------------ | ----------------------------------------------------------------------------- | ----- |
| GET    | `/`                | Lista paginada con filtros y orden                                            | 200   |
| GET    | `/proximas?dias=7` | Vencimientos de suscripciones activas en los próximos N días                  | 200   |
| GET    | `/:id`             | Detalle de una alerta                                                         | 200   |
| POST   | `/`                | Crea una alerta (todos los campos obligatorios)                               | 201   |
| PUT    | `/:id`             | Reemplaza la alerta (todos los campos obligatorios)                           | 200   |
| PATCH  | `/:id`             | Modifica solo los campos enviados                                             | 200   |
| DELETE | `/:id`             | Elimina la alerta                                                             | 200   |
| POST   | `/:id/enviar`      | Simula el envío del aviso por email (solo lo deja en la consola del servidor) | 200   |

**Query de `GET /`:** `page`, `limit` (máx. 100), `sortBy` (cualquier campo excepto `canal`), `order` (`asc` | `desc`), `estado`, `suscripcionId`, `usuarioId`, `desde` y `hasta` (rango de `fechaAviso`, `YYYY-MM-DD`).

**`GET /proximas`:** `dias` es opcional (por defecto 7, máximo 90). Toma "hoy" en hora argentina.

**Body de POST / PUT** (`diasAnticipacion`: 1–30, `fechaAviso`: `YYYY-MM-DD`, `canal`: `email`, `estado`: `activa` | `descartada`; `id` y `creadaEn` los genera la API):

```json
{
  "suscripcionId": 1,
  "usuarioId": 2,
  "diasAnticipacion": 3,
  "fechaAviso": "2026-12-10",
  "canal": "email",
  "estado": "activa"
}
```

**Errores:**

| Código | Cuándo                                                |
| ------ | ----------------------------------------------------- |
| 400    | Body o id inválido, campo no permitido, o PATCH vacío |
| 404    | La alerta no existe                                   |
| 409    | Se intenta enviar una alerta `descartada`             |
| 422    | La suscripción no existe o el usuario no es su dueño  |
