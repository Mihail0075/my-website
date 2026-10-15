import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
/** A database handle or an open transaction; services accept either. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

/**
 * Two ways to run:
 * - DATABASE_URL=postgres://…   a normal PostgreSQL server (production, tests)
 * - DATABASE_URL=pglite:<folder> PostgreSQL built into the app, stored in a folder
 *   (single-computer install, e.g. the Prilep counter on Windows; no DB server needed)
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
export const isPglite = url.startsWith("pglite:");

const globalForDb = globalThis as unknown as { appDb?: Db };

function create(): Db {
  if (isPglite) {
    // Loaded lazily so the server build doesn't need PGlite when using a real server.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    const client = new PGlite(url!.slice("pglite:".length) || "./data");
    // Same query API as node-postgres; the types differ only in driver internals.
    return drizzlePglite(client, { schema }) as unknown as Db;
  }
  return drizzle(new Pool({ connectionString: url, max: 10 }), { schema });
}

// One handle per process. Next.js can load this module more than once (pages and
// route handlers are bundled separately); with PGlite two copies would be two
// separate databases, so the handle lives on globalThis.
export const db: Db = globalForDb.appDb ?? create();
globalForDb.appDb = db;
export { schema };
