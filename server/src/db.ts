import { Pool } from 'pg';

// Single shared pool; connection settings come from environment variables.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
