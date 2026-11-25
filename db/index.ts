import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// One pool per server process. In dev, hot reloads would otherwise open a new pool each time.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // pg closes idle connections after 10s by default. A new TLS connection to a remote
    // database (Neon) costs ~2s, so keep them for 5 minutes and send TCP keep-alives.
    idleTimeoutMillis: 5 * 60_000,
    keepAlive: true,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
