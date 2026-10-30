import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, (error?: Error) => {
  if (error) {
    console.error(`[server] No se pudo iniciar en el puerto ${env.PORT}:`, error.message);
    process.exit(1);
  }
  console.log(
    `[server] StreamFamily API escuchando en http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`,
  );
});

// Cierre ordenado
function shutdown(signal: string): void {
  console.log(`[server] ${signal} recibido, cerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref(); // si algo cuelga, forzar a los 10 s
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
