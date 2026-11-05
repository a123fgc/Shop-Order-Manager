-- DANGER: permanently deletes every Shop Order Manager table and its data.
-- Only use this on a fresh/development database (e.g. to undo tables that were
-- created by hand with incompatible column types).
--
--   npm run db:reset -- --yes
--
-- Follow it with `npm run db:init` (or `npm run migrate:data`, which also
-- creates the schema) to rebuild the correct structure.

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
