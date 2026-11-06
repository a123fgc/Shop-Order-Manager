require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
// app.use(cookieParser());

const app = express();
// Trust one configured proxy hop
app.set('trust proxy', 1);

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
  'https://shop-order-manager-five.vercel.app',
  'https://shop-order-manager-6lt17z5aj-asad-developer.vercel.app',
  'http://localhost:5173',
];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Allow only explicitly trusted origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject untrusted origins without throwing a server error
      return callback(null, false);
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

    optionsSuccessStatus: 204,
  })
);
// Parse incoming JSON requests
app.use(express.json({ limit: '100kb' }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// app.use(express.json());
app.use(cookieParser());

// Parse URL-encoded requests
app.use(express.urlencoded({ limit: '100kb', extended: true }));

// Parse cookies
app.use(cookieParser());

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Shop Order Manager API is running',
  });
});
// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/auth/login', loginLimiter);

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
// app.listen() hata do ya conditional karo:
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Running on 3000'))
}
module.exports = app  // ← yeh line add karo

// Vercel serverless export
// module.exports = app;
