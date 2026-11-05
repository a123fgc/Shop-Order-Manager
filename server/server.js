
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  'https://shop-order-manager-upw3.vercel.app',
  'https://shop-order-manager-five.vercel.app',
  // 'https://shop-order-manager-five.vercel.app/login',
  'https://shop-order-manager-gguculmbr-asad-developer.vercel.app',
  'https://shop-order-manager-oooc818ev-asad-developer.vercel.app',
  'https://shop-order-manager-50fgmj8ep-asad-developer.vercel.app',
  'https://shop-order-manager-2wazdc3ze-asad-developer.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow known frontend URLs and Vercel preview deployments
      const isVercelPreview =
        /^https:\/\/shop-order-manager-[a-z0-9-]+-asad-developer\.vercel\.app$/.test(
          origin || ''
        );

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isVercelPreview
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  })
);

// Parse incoming JSON requests
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded requests
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Shop Order Manager API is running',
  });
});

// Database initialization middleware
// Wait for PostgreSQL before processing API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', {
      message: error.message,
      code: error.code,
    });

    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
    });
  }
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: 'Internal Server Error',
  });
});

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Unable to start server:', error.message);
      process.exit(1);
    });
}

// Vercel serverless export
module.exports = app;
