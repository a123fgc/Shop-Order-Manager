const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');

const app = express();

// Allowed frontend URLs
const allowedOrigins = [
  'https://shop-order-manager-five.vercel.app',
  'https://shop-order-manager-50fgmj8ep-asad-developer.vercel.app',
  'https://shop-order-manager-2wazdc3ze-asad-developer.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// CORS middleware - apply only once, before routes
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Connect PostgreSQL and ensure the schema exists.
const dbReady = connectDB();

// For serverless environments the exported app is used, so attach a handler to
// avoid an unhandled rejection. Local startup below waits for the connection.
dbReady.catch((error) => {
  console.error('Database initialization error:', error.message);
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shop Order Manager API is running',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Local development
if (require.main === module) {
  dbReady
    .then(() => {
      const PORT = process.env.PORT || 5000;

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Unable to start server:', error.message);
      process.exit(1);
    });
}

// Vercel export
module.exports = app;
