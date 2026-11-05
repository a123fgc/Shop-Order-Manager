/**
 * Import a MongoDB JSON export into PostgreSQL.
 *
 * Usage:
 *   npm run migrate:data
 *   npm run migrate:data -- path/to/export.json
 *
 * The default file is seeds/data/mongo-export.json, which was produced from the
 * MongoDB collections (users, customers, products, orders).
 *
 * Old MongoDB ObjectIds are replaced with PostgreSQL UUIDs; relationships are
 * preserved by mapping every old id to its new id.
 */

const fs = require('fs');
const path = require('path');
const { connectDB, withTransaction, closePool } = require('../config/db');

const DEFAULT_SNAPSHOT = path.join(
  __dirname,
  'data',
  'mongo-export.json'
);

const VALID_STATUSES = new Set([
  'pending',
  'processing',
  'completed',
  'cancelled',
]);

function asDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asText(value) {
  return value === null || value === undefined ? '' : String(value);
}

async function importSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const collections = raw.collections || raw;

  const users = collections.users || [];
  const customers = collections.customers || [];
  const products = collections.products || [];
  const orders = collections.orders || [];

  console.log(`Importing snapshot: ${snapshotPath}`);
  console.log(
    `Found ${users.length} users, ${customers.length} customers, ${products.length} products, ${orders.length} orders.`
  );

  console.log('Connecting to PostgreSQL...');
  await connectDB();
  console.log('Connected.');

  const summary = await withTransaction(async (client) => {
    console.log('Clearing existing PostgreSQL data...');
    await client.query(
      `TRUNCATE TABLE order_items, orders, products, customers, users
       RESTART IDENTITY CASCADE`
    );

    const userIds = new Map();

    for (const user of users) {
      const role = user.role === 'admin' ? 'admin' : 'user';

      const result = await client.query(
        `INSERT INTO users (name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          asText(user.name).trim() || 'User',
          asText(user.email).trim().toLowerCase(),
          asText(user.password),
          role,
          asDate(user.createdAt),
          asDate(user.updatedAt || user.createdAt),
        ]
      );

      userIds.set(String(user._id), result.rows[0].id);
    }

    const customerIds = new Map();

    for (const customer of customers) {
      const mappedUserId = customer.user
        ? userIds.get(String(customer.user)) || null
        : null;

      const result = await client.query(
        `INSERT INTO customers (user_id, name, email, phone, address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          mappedUserId,
          asText(customer.name).trim() || 'Customer',
          asText(customer.email).trim().toLowerCase(),
          asText(customer.phone).trim(),
          asText(customer.address).trim(),
          asDate(customer.createdAt),
        ]
      );

      customerIds.set(String(customer._id), result.rows[0].id);
    }

    const productIds = new Map();
    const productPrices = new Map();

    for (const product of products) {
      const price = asNumber(product.price, 0);

      const result = await client.query(
        `INSERT INTO products
           (name, description, price, stock, category, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          asText(product.name).trim() || 'Product',
          asText(product.description).trim(),
          price,
          Math.max(0, Math.trunc(asNumber(product.stock, 0))),
          asText(product.category).trim() || 'General',
          asDate(product.createdAt),
        ]
      );

      productIds.set(String(product._id), result.rows[0].id);
      productPrices.set(String(product._id), price);
    }

    let importedOrders = 0;
    let importedItems = 0;
    let missingReferences = 0;

    for (const order of orders) {
      const mappedUserId = order.user
        ? userIds.get(String(order.user)) || null
        : null;
      const mappedCustomerId = order.customer
        ? customerIds.get(String(order.customer)) || null
        : null;

      if (order.user && !mappedUserId) missingReferences += 1;
      if (order.customer && !mappedCustomerId) missingReferences += 1;

      const items = Array.isArray(order.items) ? order.items : [];
      const computedTotal = items.reduce(
        (sum, item) => sum + asNumber(item.price, 0) * asNumber(item.quantity, 0),
        0
      );
      const totalAmount =
        order.totalAmount === undefined || order.totalAmount === null
          ? computedTotal
          : asNumber(order.totalAmount, computedTotal);

      const orderResult = await client.query(
        `INSERT INTO orders
           (user_id, customer_id, total_amount, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          mappedUserId,
          mappedCustomerId,
          totalAmount,
          VALID_STATUSES.has(order.status) ? order.status : 'pending',
          asText(order.notes),
          asDate(order.createdAt),
          asDate(order.updatedAt || order.createdAt),
        ]
      );

      const orderId = orderResult.rows[0].id;
      importedOrders += 1;

      for (const item of items) {
        const oldProductId = String(item.product || '');
        const mappedProductId = productIds.get(oldProductId) || null;

        if (item.product && !mappedProductId) missingReferences += 1;

        const price =
          item.price === undefined || item.price === null
            ? productPrices.get(oldProductId) || 0
            : asNumber(item.price, 0);

        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [
            orderId,
            mappedProductId,
            Math.max(1, Math.trunc(asNumber(item.quantity, 1))),
            price,
          ]
        );

        importedItems += 1;
      }
    }

    return {
      users: users.length,
      customers: customers.length,
      products: products.length,
      orders: importedOrders,
      items: importedItems,
      missingReferences,
    };
  });

  console.log('\n✅ Import completed successfully!');
  console.log(`   Users:     ${summary.users}`);
  console.log(`   Customers: ${summary.customers}`);
  console.log(`   Products:  ${summary.products}`);
  console.log(`   Orders:    ${summary.orders}`);
  console.log(`   Items:     ${summary.items}`);

  if (summary.missingReferences > 0) {
    console.warn(
      `   Warning: ${summary.missingReferences} broken reference(s) were set to NULL.`
    );
  }

  console.log('\n   Login with your existing MongoDB credentials.\n');
}

const snapshotPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_SNAPSHOT;

importSnapshot(snapshotPath)
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Import error:', error);
    await closePool().catch(() => {});
    process.exit(1);
  });
