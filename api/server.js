/**
 * Vercel serverless entry point.
 *
 * Vercel only auto-detects functions inside an `api/` directory, so the
 * Express app that lives in `server/server.js` is re-exported from here.
 * Requests to /api/* are routed to this file by vercel.json.
 */
module.exports = require('../server/server.js');
