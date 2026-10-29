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
