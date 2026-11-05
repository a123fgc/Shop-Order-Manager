/**
 * Drop every Shop Order Manager table (destructive).
 *
 * Usage:
 *   npm run db:reset -- --yes
 *
 * The `--yes` flag is required so the command can never wipe a database by
 * accident. Intended for fresh/dev databases, e.g. when tables were created by
 * hand with incompatible column types and `db:init` cannot add foreign keys.
 */

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/db');

const RESET_PATH = path.join(__dirname, '..', 'db', 'reset.sql');

(async () => {
  if (!process.argv.includes('--yes')) {
    console.error(
      'Refusing to drop tables without confirmation.\n' +
        'Run: npm run db:reset -- --yes'
    );
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(RESET_PATH, 'utf8');

    console.log('Connecting to PostgreSQL...');
    // Deliberately avoid connectDB(): it would try to create the schema first,
    // which is exactly what fails when incompatible tables already exist.
    await getPool().query('SELECT 1');

    console.log('Dropping tables...');
    await getPool().query(sql);

    console.log('✅ Tables dropped. Run `npm run db:init` to recreate them.');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Database reset error:', error.message || error.code || error);
    await closePool().catch(() => {});
    process.exit(1);
  }
})();
