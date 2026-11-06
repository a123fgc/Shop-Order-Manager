const bcrypt = require('bcryptjs');
const { connectDB, withTransaction, closePool } = require('../config/db');

// ── Seed data ───────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { name: 'John Smith', email: 'john.smith@email.com', phone: '555-0101', address: '123 Oak Street, Springfield, IL 62701' },
  { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '555-0102', address: '456 Maple Ave, Portland, OR 97201' },
  { name: 'Michael Brown', email: 'mbrown@email.com', phone: '555-0103', address: '789 Pine Road, Austin, TX 78701' },
  { name: 'Emily Davis', email: 'emily.d@email.com', phone: '555-0104', address: '321 Elm Street, Denver, CO 80201' },
  { name: 'Robert Wilson', email: 'rwilson@email.com', phone: '555-0105', address: '654 Cedar Lane, Seattle, WA 98101' },
  { name: 'Jessica Martinez', email: 'jmartinez@email.com', phone: '555-0106', address: '987 Birch Blvd, Miami, FL 33101' },
  { name: 'David Anderson', email: 'danderson@email.com', phone: '555-0107', address: '147 Walnut Dr, Chicago, IL 60601' },
  { name: 'Lisa Thomas', email: 'lisa.t@email.com', phone: '555-0108', address: '258 Spruce Ct, Boston, MA 02101' },
  { name: 'James Taylor', email: 'jtaylor@email.com', phone: '555-0109', address: '369 Ash Way, San Francisco, CA 94101' },
  { name: 'Amanda White', email: 'awhite@email.com', phone: '555-0110', address: '741 Poplar St, Nashville, TN 37201' },
];

const PRODUCTS = [
  { name: 'Wireless Bluetooth Headphones', description: 'Noise-cancelling over-ear headphones with 30h battery', price: 79.99, stock: 150, category: 'Electronics' },
  { name: 'USB-C Charging Cable (6ft)', description: 'Braided nylon fast-charging cable', price: 12.99, stock: 500, category: 'Electronics' },
  { name: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with Cherry MX switches', price: 129.99, stock: 75, category: 'Electronics' },
  { name: 'Cotton Crew-Neck T-Shirt', description: '100% organic cotton, available in multiple colors', price: 24.99, stock: 300, category: 'Clothing' },
  { name: 'Slim Fit Jeans', description: 'Stretch denim slim fit jeans', price: 49.99, stock: 200, category: 'Clothing' },
  { name: 'Running Shoes', description: 'Lightweight breathable mesh running shoes', price: 89.99, stock: 120, category: 'Clothing' },
  { name: 'Organic Green Tea (100 bags)', description: 'Premium Japanese organic green tea', price: 18.99, stock: 400, category: 'Food' },
  { name: 'Dark Chocolate Bar (72%)', description: 'Belgian dark chocolate, 200g bar', price: 5.99, stock: 600, category: 'Food' },
  { name: 'Extra Virgin Olive Oil (1L)', description: 'Cold-pressed Italian extra virgin olive oil', price: 14.99, stock: 250, category: 'Food' },
  { name: 'Stainless Steel Water Bottle', description: 'Insulated 750ml water bottle, keeps drinks cold 24h', price: 29.99, stock: 180, category: 'Home' },
  { name: 'Scented Candle Set', description: 'Set of 3 soy wax candles – lavender, vanilla, citrus', price: 22.99, stock: 220, category: 'Home' },
  { name: 'Yoga Mat', description: 'Non-slip 6mm thick exercise yoga mat', price: 34.99, stock: 160, category: 'Sports' },
  { name: 'Resistance Bands (5-pack)', description: 'Latex-free resistance bands with varying tensions', price: 19.99, stock: 300, category: 'Sports' },
  { name: 'Hardcover Notebook', description: 'A5 ruled hardcover notebook, 200 pages', price: 9.99, stock: 450, category: 'Stationery' },
  { name: 'Ballpoint Pen Set (10-pack)', description: 'Smooth-writing medium point pens, assorted colors', price: 7.99, stock: 500, category: 'Stationery' },
];

const STATUSES = ['pending', 'processing', 'completed', 'cancelled'];

const NOTES = [
  'Please deliver before noon',
  'Gift wrap requested',
  'Leave at the front door',
  'Call before delivery',
  'Fragile items inside',
  '',
];

function buildOrders(customers, products) {
  const orders = [];

  for (let i = 0; i < 20; i += 1) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    const usedProducts = new Set();

    for (let j = 0; j < numItems; j += 1) {
      let product;

      do {
        product = products[Math.floor(Math.random() * products.length)];
      } while (usedProducts.has(product.id));

      usedProducts.add(product.id);

      const quantity = Math.floor(Math.random() * 4) + 1;

      items.push({
        productId: product.id,
        quantity,
        price: Number(product.price),
      });
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    orders.push({
      customerId: customer.id,
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      notes: NOTES[Math.floor(Math.random() * NOTES.length)],
      createdAt,
    });
  }

  return orders;
}

// ── Main seed function ──────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('Connecting to PostgreSQL...');
    await connectDB();
    console.log('Connected.');

    const summary = await withTransaction(async (client) => {
      console.log('Clearing existing data...');
      await client.query(
        `TRUNCATE TABLE order_items, orders, products, customers, users
         RESTART IDENTITY CASCADE`
      );

      // Admin user
      const hashedPassword = await bcrypt.hash('admin@123!', 10);
      const adminResult = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id`,
        ['Admin User', 'admin@example.com', hashedPassword]
      );

      // Customers
      const customers = [];

      for (const customer of CUSTOMERS) {
        const result = await client.query(
          `INSERT INTO customers (name, email, phone, address)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, email`,
          [customer.name, customer.email, customer.phone, customer.address]
        );

        customers.push(result.rows[0]);
      }

      // Products
      const products = [];

      for (const product of PRODUCTS) {
        const result = await client.query(
          `INSERT INTO products (name, description, price, stock, category)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, price`,
          [
            product.name,
            product.description,
            product.price,
            product.stock,
            product.category,
          ]
        );

        products.push(result.rows[0]);
      }

      // Orders
      const orders = buildOrders(customers, products);

      for (const order of orders) {
        const orderResult = await client.query(
          `INSERT INTO orders
             (customer_id, total_amount, status, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           RETURNING id`,
          [
            order.customerId,
            order.totalAmount,
            order.status,
            order.notes,
            order.createdAt,
          ]
        );

        for (const item of order.items) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price)
             VALUES ($1, $2, $3, $4)`,
            [orderResult.rows[0].id, item.productId, item.quantity, item.price]
          );
        }
      }

      return {
        admin: adminResult.rows[0],
        customers: customers.length,
        products: products.length,
        orders: orders.length,
      };
    });

    console.log(`  Admin created: admin@example.com / admin123`);
    console.log(`  ${summary.customers} customers created.`);
    console.log(`  ${summary.products} products created.`);
    console.log(`  ${summary.orders} orders created.`);

    console.log('\n✅ Database seeded successfully!');
    console.log('   Login with: admin@example.com / admin123\n');

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    await closePool().catch(() => { });
    process.exit(1);
  }
};

seed();
