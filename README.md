# StreamFamily-Backend

API REST de **StreamFamily**, gestor de suscripciones de plataformas de streaming.

Node.js + Express + TypeScript. En esta etapa los datos están mockeados (sin base de datos).

## Cómo levantarlo localmente

**Requisitos:** Node.js 22 o superior.

```bash
git clone https://github.com/NCastellini/StreamFamily-Backend.git
cd StreamFamily-Backend
npm install
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
