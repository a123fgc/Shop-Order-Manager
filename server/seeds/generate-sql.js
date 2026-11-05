/**
 * Generate a single SQL file that creates the Shop Order Manager schema and
 * inserts the exported MongoDB data into Supabase.
 *
 * Usage:
 *   npm run gen:supabase-sql
 *   npm run gen:supabase-sql -- path/to/export.json
 *
 * Output: db/supabase-setup.sql
 *
 * The generated file is self-contained: paste it into the Supabase SQL Editor
 * and run it. Every row gets an explicit UUID, so foreign keys stay correct
 * without needing the original MongoDB ObjectIds.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DEFAULT_SNAPSHOT = path.join(__dirname, 'data', 'mongo-export.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'db', 'supabase-setup.sql');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

const VALID_STATUSES = new Set(['pending', 'processing', 'completed', 'cancelled']);

function asDate(value) {
  const date = value ? new Date(value) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asText(value) {
  return value === null || value === undefined ? '' : String(value);
}

function lit(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function money(value) {
  return asNumber(value, 0).toFixed(2);
}

function insertBlock(table, columns, rows) {
  if (rows.length === 0) return `-- ${table}: no rows\n`;

  const values = rows
    .map((row) => `  (${row.map(lit).join(', ')})`)
    .join(',\n');

  return (
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n` +
    `${values}\n` +
    `ON CONFLICT (id) DO NOTHING;\n`
  );
}

function buildSql(snapshot) {
  const collections = snapshot.collections || snapshot;

  const users = collections.users || [];
  const customers = collections.customers || [];
  const products = collections.products || [];
  const orders = collections.orders || [];

  const idMap = new Map();
  const newId = (oldId) => {
    const key = String(oldId);
    if (!idMap.has(key)) idMap.set(key, randomUUID());
    return idMap.get(key);
  };

  const userRows = users.map((user) => [
    newId(user._id),
    asText(user.name).trim() || 'User',
    asText(user.email).trim().toLowerCase(),
    asText(user.password),
    user.role === 'admin' ? 'admin' : 'user',
    asDate(user.createdAt),
    asDate(user.updatedAt || user.createdAt),
  ]);

  const customerRows = customers.map((customer) => [
    newId(customer._id),
    customer.user ? newId(customer.user) : null,
    asText(customer.name).trim() || 'Customer',
    asText(customer.email).trim().toLowerCase(),
    asText(customer.phone).trim(),
    asText(customer.address).trim(),
    asDate(customer.createdAt),
  ]);

  const productRows = products.map((product) => [
    newId(product._id),
    asText(product.name).trim() || 'Product',
    asText(product.description).trim(),
    money(product.price),
    Math.max(0, Math.trunc(asNumber(product.stock, 0))),
    asText(product.category).trim() || 'General',
    asDate(product.createdAt),
  ]);

  const orderRows = [];
  const itemRows = [];
  let itemCount = 0;

  for (const order of orders) {
    const orderId = newId(order._id);
    const items = Array.isArray(order.items) ? order.items : [];

    const computedTotal = items.reduce(
      (sum, item) => sum + asNumber(item.price, 0) * asNumber(item.quantity, 0),
      0
    );
    const total =
      order.totalAmount === undefined || order.totalAmount === null
        ? computedTotal
        : asNumber(order.totalAmount, computedTotal);

    const createdAt = asDate(order.createdAt);

    orderRows.push([
      orderId,
      order.user ? newId(order.user) : null,
      order.customer ? newId(order.customer) : null,
      money(total),
      VALID_STATUSES.has(order.status) ? order.status : 'pending',
      asText(order.notes),
      createdAt,
      asDate(order.updatedAt || order.createdAt),
    ]);

    for (const item of items) {
      itemRows.push([
        newId(item._id || randomUUID()),
        orderId,
        item.product ? newId(item.product) : null,
        Math.max(1, Math.trunc(asNumber(item.quantity, 1))),
        money(item.price),
        createdAt,
      ]);
      itemCount += 1;
    }
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8').trim();

  return `-- =====================================================================
-- Shop Order Manager - Supabase setup (schema + existing data)
-- Generated: ${new Date().toISOString()}
-- Source: ${users.length} users, ${customers.length} customers,
--         ${products.length} products, ${orders.length} orders, ${itemCount} items
--
-- HOW TO USE
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this whole file and click Run.
--   3. Table Editor should show the 5 tables with the data.
--
-- WARNING: this drops the five app tables first. It is meant for a fresh
-- database. Do not run it on a database that already holds data you need.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------
${schema}

-- ---------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------
${insertBlock(
    'users',
    ['id', 'name', 'email', 'password', 'role', 'created_at', 'updated_at'],
    userRows
  )}
${insertBlock(
    'customers',
    ['id', 'user_id', 'name', 'email', 'phone', 'address', 'created_at'],
    customerRows
  )}
${insertBlock(
    'products',
    ['id', 'name', 'description', 'price', 'stock', 'category', 'created_at'],
    productRows
  )}
${insertBlock(
    'orders',
    [
      'id',
      'user_id',
      'customer_id',
      'total_amount',
      'status',
      'notes',
      'created_at',
      'updated_at',
    ],
    orderRows
  )}
${insertBlock(
    'order_items',
    ['id', 'order_id', 'product_id', 'quantity', 'price', 'created_at'],
    itemRows
  )}
COMMIT;

-- ---------------------------------------------------------------------
-- Verification (run on its own if the editor only shows the last result)
-- ---------------------------------------------------------------------
SELECT 'users' AS table_name, COUNT(*)::int AS rows FROM users
UNION ALL SELECT 'customers', COUNT(*)::int FROM customers
UNION ALL SELECT 'products',  COUNT(*)::int FROM products
UNION ALL SELECT 'orders',    COUNT(*)::int FROM orders
UNION ALL SELECT 'order_items', COUNT(*)::int FROM order_items
ORDER BY table_name;

-- Optional: enable RLS if you ever expose these tables through the Supabase
-- API (the Express backend connects as the postgres role and bypasses RLS).
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
`;
}

const snapshotPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_SNAPSHOT;

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath}`);
  process.exit(1);
}

const sql = buildSql(JSON.parse(fs.readFileSync(snapshotPath, 'utf8')));

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, sql, 'utf8');

const lines = sql.split('\n').length;
console.log(`✅ Wrote ${OUTPUT_PATH}`);
console.log(`   ${lines} lines, ${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB`);
console.log('   Paste it into Supabase SQL Editor and click Run.');
