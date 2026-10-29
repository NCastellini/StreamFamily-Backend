import { config } from 'dotenv';

config({ quiet: true });

type NodeEnv = 'development' | 'production' | 'test';

export interface Env {
  NODE_ENV: NodeEnv;
  isProduction: boolean;
  isDevelopment: boolean;
  PORT: number;
  CORS_ORIGIN: string[];
  JWT_SECRET: string;
}

const DEV_DEFAULTS = {
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'streamfamily-dev-secret-NO-usar-en-produccion',
} as const;

type RequiredVar = keyof typeof DEV_DEFAULTS;

function readNodeEnv(): NodeEnv {
  const raw = process.env.NODE_ENV?.trim() || 'development';
  if (raw === 'development' || raw === 'production' || raw === 'test') return raw;
  throw new Error(`NODE_ENV inválido: "${raw}". Valores permitidos: development, production, test.`);
}

function loadEnv(): Env {
  const NODE_ENV = readNodeEnv();
  const isProduction = NODE_ENV === 'production';
  const errors: string[] = [];

  const read = (name: RequiredVar): string => {
    const value = process.env[name]?.trim();
    if (value) return value;
    if (isProduction) {
      errors.push(`Falta la variable ${name}.`);
      return '';
    }
    return DEV_DEFAULTS[name];
  };

  const portRaw = read('PORT');
  const corsRaw = read('CORS_ORIGIN');
  const JWT_SECRET = read('JWT_SECRET');

  const PORT = Number(portRaw);
  if (portRaw && (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535)) {
    errors.push(`PORT debe ser un entero entre 1 y 65535 (recibido: "${portRaw}").`);
  }

  const CORS_ORIGIN = corsRaw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (isProduction && CORS_ORIGIN.includes('*')) {
    errors.push('CORS_ORIGIN no puede ser "*" en producción.');
  }

  if (isProduction && JWT_SECRET) {
    if (JWT_SECRET === DEV_DEFAULTS.JWT_SECRET) {
      errors.push('JWT_SECRET no puede ser el valor de desarrollo en producción.');
    } else if (JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET debe tener al menos 32 caracteres en producción.');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida (NODE_ENV=${NODE_ENV}):\n  - ${errors.join('\n  - ')}`,
    );
  }

  return Object.freeze({
    NODE_ENV,
    isProduction,
    isDevelopment: NODE_ENV === 'development',
    PORT,
    CORS_ORIGIN,
    JWT_SECRET,
  });
}

function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    console.error(`[env] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export const env: Readonly<Env> = loadEnvOrExit();