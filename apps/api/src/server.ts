import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { z } from 'zod';
import { buildApp } from './app.js';
import * as schema from './db/schema.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requise'),
  CORS_ORIGIN: z.string().optional(),
});

async function start() {
  const parsedEnv = envSchema.safeParse(process.env);
  if (!parsedEnv.success) {
    console.error('Configuration environnement invalide :', parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
  }

  const env = parsedEnv.data;

  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  const corsOrigin = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;

  const app = await buildApp({
    db,
    corsOrigin,
  });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Arrêt gracieux de l’API en cours...');
    try {
      await app.close();
      await pool.end();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Erreur lors de la fermeture de l’API');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Documentation Swagger disponible sur http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error({ err }, 'Impossible de démarrer le serveur Fastify');
    await pool.end();
    process.exit(1);
  }
}

void start();
