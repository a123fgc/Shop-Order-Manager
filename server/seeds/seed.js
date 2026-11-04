const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Inline schemas (mirrors the ones in controllers) ────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  category: { type: String, trim: true, default: 'General' },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  }],
  totalAmount: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending' },
  notes: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// ── Seed data ───────────────────────────────────────────────────────────────

const seedUsers = async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  return User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
  });
};

const seedCustomers = () => {
  const customers = [
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
  return Customer.insertMany(customers);
};

const seedProducts = () => {
  const products = [
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
  return Product.insertMany(products);
};

const seedOrders = async (customers, products) => {
  const statuses = ['pending', 'processing', 'completed', 'cancelled'];
  const notes = [
    'Please deliver before noon',
    'Gift wrap requested',
    'Leave at the front door',
    'Call before delivery',
    'Fragile items inside',
    '',
  ];

  const orders = [];

  for (let i = 0; i < 20; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
    const items = [];
    const usedProducts = new Set();

    for (let j = 0; j < numItems; j++) {
      let product;
      do {
        product = products[Math.floor(Math.random() * products.length)];
      } while (usedProducts.has(product._id.toString()));
      usedProducts.add(product._id.toString());

      const quantity = Math.floor(Math.random() * 4) + 1; // 1-4 quantity
      items.push({
        product: product._id,
        quantity,
        price: product.price,
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Spread orders across the last 60 days
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    orders.push({
      customer: customer._id,
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status,
      notes: notes[Math.floor(Math.random() * notes.length)],
      createdAt,
    });
  }

  return Order.insertMany(orders);
};

// ── Main seed function ──────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Clear all collections
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Data cleared.');

    // Seed
    console.log('Seeding users...');
    const adminUser = await seedUsers();
    console.log(`  Admin created: ${adminUser.email} / admin123`);

    console.log('Seeding customers...');
    const customers = await seedCustomers();
    console.log(`  ${customers.length} customers created.`);

    console.log('Seeding products...');
    const products = await seedProducts();
    console.log(`  ${products.length} products created.`);

    console.log('Seeding orders...');
    const orders = await seedOrders(customers, products);
    console.log(`  ${orders.length} orders created.`);

    console.log('\n✅ Database seeded successfully!');
    console.log('   Login with: admin@example.com / admin123\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
