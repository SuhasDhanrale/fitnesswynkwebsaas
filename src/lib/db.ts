import 'server-only';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add the Neon connection string to your environment.');
}

export const sql = neon(databaseUrl);
