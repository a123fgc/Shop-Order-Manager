const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env before the pool is created. dotenv does not override variables that
// are already provided by the host (Vercel, Docker, etc.).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

let pool = null;
let initPromise = null;

function resolveSsl(connectionString) {
  if (process.env.PGSSL === 'true') {
    return { rejectUnauthorized: false };
  }

  if (process.env.PGSSL === 'false') {
    return false;
  }
  if ((connectionString || '').includes('supabase.com')) {
    return { rejectUnauthorized: false };
  }
  return /sslmode=require/i.test(connectionString || '')
    ? { rejectUnauthorized: false }
    : false;


  // Most hosted providers (Supabase, Render, Railway...) require SSL and
  // advertise it in the URL. Local PostgreSQL normally does not.
  return /sslmode=require/i.test(connectionString || '')
    ? { rejectUnauthorized: false }
    : false;
}

function createPool() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to server/.env or the environment.'
    );
  }

  // pg parses `sslmode=require` from the connection string into `ssl: {}`,
  // and `Object.assign` lets that override our explicit `ssl` config
  // (e.g. { rejectUnauthorized: false }). Strip it so our ssl config wins.
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/, '');



  const newPool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis:
      Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10_000,
    ssl: resolveSsl(connectionString),
  });

  newPool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
  });

  return newPool;
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

function describeConnection(connectionString) {
  try {
    const url = new URL(connectionString);
    const port = url.port || '5432';
    const database = url.pathname.replace(/^\//, '') || 'postgres';
    return `${url.hostname}:${port}/${database}`;
  } catch {
    return 'the configured DATABASE_URL';
  }
}

function isConnectionRefused(error) {
  if (!error) return false;
  if (error.code === 'ECONNREFUSED') return true;

  return (
    Array.isArray(error.errors) &&
    error.errors.some((item) => item.code === 'ECONNREFUSED')
  );
}

function query(text, params) {
  return getPool().query(text, params);
}

/**
 * Run a callback inside a single transaction. The callback receives a checked
 * out client. Any thrown error rolls the transaction back automatically.
 */
async function withTransaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function initDB() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

  try {
    await getPool().query(schema);
  } catch (error) {
    // 42804 = datatype_mismatch. Usually means a table was created by hand with
    // different column types, so `CREATE TABLE IF NOT EXISTS` skipped it and a
    // foreign key cannot be added.
    if (error.code === '42804') {
      const wrapped = new Error(
        'The database contains tables with incompatible column types, so a ' +
        'foreign key cannot be created. On a fresh/development database run ' +
        '`npm run db:reset -- --yes` and then `npm run db:init`.'
      );
      wrapped.code = error.code;
      wrapped.cause = error;
      throw wrapped;
    }

    throw error;
  }
}

/**
 * Ensure the database is reachable and (unless disabled) create the schema.
 * The promise is cached so serverless invocations only initialize once.
 */
function connectDB() {
  if (!initPromise) {
    initPromise = (async () => {
      const { rows } = await getPool().query('SELECT current_database() AS db');
      const databaseName = rows[0]?.db || 'database';

      if (process.env.PG_AUTO_MIGRATE !== 'false') {
        await initDB();
      }

      console.log(`PostgreSQL Connected: ${databaseName}`);
    })().catch((error) => {
      // Allow a later invocation to retry after a transient failure.
      initPromise = null;

      if (isConnectionRefused(error)) {
        const target = describeConnection(process.env.DATABASE_URL);
        const isLocal = /^(localhost|127\.0\.0\.1|::1)(:|$)/i.test(target);

        const wrapped = new Error(
          `Cannot connect to PostgreSQL at ${target}. ` +
          (isLocal
            ? 'DATABASE_URL in server/.env still points to a local database, but no local PostgreSQL is running. ' +
            'Replace it with your Supabase connection string ' +
            '(Dashboard -> Connect -> Session pooler, ending in ?sslmode=require).'
            : 'Check that the database is running, that the host/port are correct, ' +
            'and that your provider allows connections from this network.')
        );
        wrapped.code = 'ECONNREFUSED';
        wrapped.cause = error;
        throw wrapped;
      }

      if (error.code === '28P01' || error.code === '28000') {
        const wrapped = new Error(
          `Password authentication failed for PostgreSQL at ${describeConnection(
            process.env.DATABASE_URL
          )}. ` +
          'Check the username/password in DATABASE_URL. Special characters in ' +
          'the password must be URL-encoded (for example @ becomes %40).'
        );
        wrapped.code = error.code;
        wrapped.cause = error;
        throw wrapped;
      }

      if (error.code === 'ENOTFOUND') {
        const wrapped = new Error(
          `PostgreSQL host not found: ${describeConnection(
            process.env.DATABASE_URL
          )}. ` +
          'Check the pooler region in DATABASE_URL, then run `npm run db:check`.'
        );
        wrapped.code = error.code;
        wrapped.cause = error;
        throw wrapped;
      }

      throw error;
    });
  }

  return initPromise;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    initPromise = null;
  }
}

module.exports = {
  getPool,
  query,
  withTransaction,
  connectDB,
  initDB,
  closePool,
  describeConnection,
};
