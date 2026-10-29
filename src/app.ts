import cors from 'cors';
import type { CorsOptions } from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { apiRouter } from './routes';

// cors
const corsOptions: CorsOptions = env.isProduction ? { origin: env.CORS_ORIGIN } : { origin: true };

export const app = express();

app.disable('x-powered-by'); // no anunciar que el server es Express
app.set('trust proxy', 1); // Render está detrás de un proxy

// Middlewares globales
app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use('/api/v1', apiRouter);

// Siempre al final y en este orden
app.use(notFoundHandler);
app.use(errorHandler);