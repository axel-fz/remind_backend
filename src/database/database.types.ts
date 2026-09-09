import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export type DrizzleDatabase = NodePgDatabase<typeof schema>;
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');