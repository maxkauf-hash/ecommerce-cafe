import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema.js';

export type DrizzleDb = NodePgDatabase<typeof schema>;
