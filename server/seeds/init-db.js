const { connectDB, closePool } = require('../config/db');

(async () => {
  try {
    console.log('Connecting to PostgreSQL...');
    await connectDB();
    console.log('✅ Database schema is ready.');
    await closePool();
    process.exit(0);
  } catch (error) {
    const details =
      error.message ||
      (Array.isArray(error.errors) && error.errors.map((item) => item.message).join('; ')) ||
      error.code ||
      String(error);

    console.error('Database initialization error:', details);
    await closePool().catch(() => {});
    process.exit(1);
  }
})();
