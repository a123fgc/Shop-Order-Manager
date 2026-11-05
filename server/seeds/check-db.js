/**
 * Diagnose the database configuration in server/.env.
 *
 * Usage:
 *   npm run db:check
 *
 * Read-only: it never creates or changes anything. It reports whether
 * DATABASE_URL is a valid PostgreSQL URI, then tries a single SELECT 1 and
 * lists the app tables if they exist.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getPool, closePool, describeConnection } = require('../config/db');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

function fail(title, details) {
  console.error(`\n❌ ${title}`);
  if (details) console.error(details.replace(/^/gm, '   '));
  process.exitCode = 1;
}

async function main() {
  const url = process.env.DATABASE_URL;

  console.log('Checking server/.env ...\n');

  if (!url) {
    return fail(
      'DATABASE_URL is not set.',
      'Add one line to server/.env:\n' +
        'DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require'
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(url.trim())) {
    const extra = ['host', 'port', 'database', 'user', 'password']
      .filter((key) => process.env[key] !== undefined)
      .map((key) => `  ${key}=...`);

    return fail(
      'DATABASE_URL is not a PostgreSQL URI.',
      `It must start with postgresql:// or postgres://, but starts with: ${url.slice(0, 40)}...\n\n` +
        (extra.length
          ? `It looks like the connection details were split across separate lines:\n${extra.join('\n')}\n` +
            'Those variables are ignored by the app. Combine everything into ONE line.'
          : 'Copy the full "Session pooler" URI from Supabase.')
    );
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return fail(
      'DATABASE_URL could not be parsed.',
      'Check for spaces, quotes, or unescaped characters such as @ : / # ? in the password.\n' +
        'Encode special characters (for example @ becomes %40).'
    );
  }

  const database = parsed.pathname.replace(/^\//, '') || '(none)';
  const sslMode = parsed.searchParams.get('sslmode');

  console.log('Parsed connection:');
  console.log(`  target   : ${describeConnection(url)}`);
  console.log(`  host     : ${parsed.hostname}`);
  console.log(`  port     : ${parsed.port || '5432'}`);
  console.log(`  database : ${database}`);
  console.log(`  user     : ${parsed.username || '(none)'}`);
  console.log(`  password : ${mask(decodeURIComponent(parsed.password || ''))}`);
  console.log(`  sslmode  : ${sslMode || '(not set)'}`);

  const isLocal = /^(localhost|127\.0\.0\.1|::1)$/i.test(parsed.hostname);
  if (!isLocal && sslMode !== 'require') {
    console.warn('\n⚠️  Remote host without ?sslmode=require — Supabase requires SSL.');
  }

  console.log('\nConnecting ...');

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT current_database() AS db, current_user AS usr, version() AS version'
    );

    console.log(`✅ Connected to "${rows[0].db}" as "${rows[0].usr}"`);
    console.log(`   ${rows[0].version.split(',')[0]}`);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users','customers','products','orders','order_items')
      ORDER BY table_name
    `);

    const names = tables.rows.map((row) => row.table_name);
    console.log(`\nApp tables found (${names.length}/5): ${names.join(', ') || '(none)'}`);

    if (names.length === 5) {
      const counts = await pool.query(`
        SELECT 'users' AS t, COUNT(*)::int AS n FROM users
        UNION ALL SELECT 'customers', COUNT(*)::int FROM customers
        UNION ALL SELECT 'products', COUNT(*)::int FROM products
        UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
        UNION ALL SELECT 'order_items', COUNT(*)::int FROM order_items
        ORDER BY t
      `);
      console.log('\nRow counts:');
      for (const row of counts.rows) {
        console.log(`  ${row.t.padEnd(12)} ${row.n}`);
      }
    }
  } catch (error) {
    const code = error.code;
    const hints = {
      '28P01': 'Wrong password. Re-copy the connection string from Supabase, and URL-encode special characters (@ → %40, # → %23).',
      '3D000': 'The database does not exist. Use /postgres for Supabase.',
      ENOTFOUND: 'Host not found. Check the region in the pooler hostname.',
      ETIMEDOUT: 'Connection timed out. Check your network/firewall.',
      ECONNREFUSED: 'Nothing is listening on that host/port.',
      '28000': 'Authentication rejected. Check the username (postgres.<project-ref> for the pooler).',
    };

    return fail(
      `Connection failed (${code || 'unknown error'}): ${error.message}`,
      hints[code] || undefined
    );
  } finally {
    await closePool().catch(() => {});
  }
}

main().catch(async (error) => {
  console.error('Unexpected error:', error);
  await closePool().catch(() => {});
  process.exit(1);
});
