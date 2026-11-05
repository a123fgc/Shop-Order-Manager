-- =====================================================================
-- Shop Order Manager - Supabase setup (schema + existing data)
-- Generated: 2026-11-05T13:20:51.285Z
-- Source: 4 users, 13 customers,
--         15 products, 25 orders, 47 items
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
-- Shop Order Manager - PostgreSQL schema
-- Safe to run repeatedly: every object is created only when missing.
-- Requires PostgreSQL 13+ for the built-in gen_random_uuid() function.

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin', 'user')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL DEFAULT '',
  phone       VARCHAR(50)  NOT NULL DEFAULT '',
  address     TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255)   NOT NULL,
  description  TEXT           NOT NULL DEFAULT '',
  price        NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock        INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category     VARCHAR(120)   NOT NULL DEFAULT 'General',
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status        VARCHAR(20)    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  notes         TEXT           NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity    INTEGER        NOT NULL CHECK (quantity >= 1),
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON customers (user_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at  ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product  ON order_items (product_id);

-- ---------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------
INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES
  ('ad81ea45-a756-4091-9dd5-1feed99a1f6f', 'Admin User', 'admin@example.com', '$2a$10$gI0kzX9xVb8XDJUZQDIG7O56A1V4BIebc7cRldBj9dzZxfbJEhZsu', 'admin', '2026-11-04T10:51:01.585Z', '2026-11-04T10:51:01.585Z'),
  ('b1e1027a-4d7d-41a1-8f5b-554beb814050', 'Asad', 'asad@gmail.com', '$2a$10$PkTR5.w53/J4hxxXwPGO7uX7WLnSoXl1KzW98UHDCVobJME2SCeTi', 'user', '2026-11-04T12:23:34.247Z', '2026-11-04T12:23:34.247Z'),
  ('f12c7dfa-9995-4b84-a77a-72b118bfbbb3', 'Asim', 'asim@gmail.com', '$2a$10$eHIw7x7NdfZ/HBPj8xc0S.Q3IiNgp0eeHYGXInB64JSY7WXAc3A56', 'user', '2026-11-05T07:41:33.345Z', '2026-11-05T07:41:33.345Z'),
  ('b5dde465-8407-4703-ab24-14b1479f4982', 'anas', 'anas@gmail.com', '$2a$10$hv8e0seHERlAKPdvyz82Kez1xkO2kO/QJQi4OwVU1G.AmjMIbEA1K', 'user', '2026-11-05T08:29:51.662Z', '2026-11-05T08:29:51.662Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, user_id, name, email, phone, address, created_at) VALUES
  ('a4d7e7a1-8250-49c5-aa7a-08382050c4eb', NULL, 'John Smith', 'john.smith@email.com', '555-0101', '123 Oak Street, Springfield, IL 62701', '2026-11-04T10:51:01.616Z'),
  ('f4343b2a-6992-42fb-92c7-07cec0f9ceee', NULL, 'Sarah Johnson', 'sarah.j@email.com', '555-0102', '456 Maple Ave, Portland, OR 97201', '2026-11-04T10:51:01.628Z'),
  ('68ced367-ac55-44f0-aaeb-dc5396813950', NULL, 'Michael Brown', 'mbrown@email.com', '555-0103', '789 Pine Road, Austin, TX 78701', '2026-11-04T10:51:01.629Z'),
  ('b26f5eac-6f55-4ace-9640-cf5592788ede', NULL, 'Emily Davis', 'emily.d@email.com', '555-0104', '321 Elm Street, Denver, CO 80201', '2026-11-04T10:51:01.635Z'),
  ('2e068590-37c8-40f9-9e51-64991f5596e9', NULL, 'Robert Wilson', 'rwilson@email.com', '555-0105', '654 Cedar Lane, Seattle, WA 98101', '2026-11-04T10:51:01.637Z'),
  ('540b1261-3322-467b-8887-25146a2be50e', NULL, 'Jessica Martinez', 'jmartinez@email.com', '555-0106', '987 Birch Blvd, Miami, FL 33101', '2026-11-04T10:51:01.637Z'),
  ('10ab428d-2026-498a-968e-f3af218c82c6', NULL, 'David Anderson', 'danderson@email.com', '555-0107', '147 Walnut Dr, Chicago, IL 60601', '2026-11-04T10:51:01.637Z'),
  ('9b553992-cac8-4f21-b5ef-552ddb12fa7b', NULL, 'Lisa Thomas', 'lisa.t@email.com', '555-0108', '258 Spruce Ct, Boston, MA 02101', '2026-11-04T10:51:01.638Z'),
  ('e974320d-2bb1-4e11-917c-674060e3d7b8', NULL, 'James Taylor', 'jtaylor@email.com', '555-0109', '369 Ash Way, San Francisco, CA 94101', '2026-11-04T10:51:01.643Z'),
  ('9dcc8f82-f430-49cb-9732-83cfa692eabd', NULL, 'Amanda White', 'awhite@email.com', '555-0110', '741 Poplar St, Nashville, TN 37201', '2026-11-04T10:51:01.644Z'),
  ('2f3a71a2-0f02-44af-bce4-00c2b3bba41a', 'b1e1027a-4d7d-41a1-8f5b-554beb814050', 'Asad', 'asad@gmail.com', '', '', '2026-11-05T13:20:51.284Z'),
  ('ec0c6882-6659-48b3-bec9-f9eb8c69ecae', 'f12c7dfa-9995-4b84-a77a-72b118bfbbb3', 'Asim', 'asim@gmail.com', '', '', '2026-11-05T07:41:33.485Z'),
  ('3e3155bd-61d7-4ad7-8f04-dd06a4facf91', 'b5dde465-8407-4703-ab24-14b1479f4982', 'anas', 'anas@gmail.com', '', '', '2026-11-05T08:29:51.923Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, description, price, stock, category, created_at) VALUES
  ('82ecf540-be92-47d7-ac9b-242e8dcdd532', 'Wireless Bluetooth Headphones', 'Noise-cancelling over-ear headphones with 30h battery', '79.99', 149, 'Electronics', '2026-11-04T10:51:01.678Z'),
  ('49feb184-b833-4c6c-a80b-7d2842cc4131', 'USB-C Charging Cable (6ft)', 'Braided nylon fast-charging cable', '12.99', 500, 'Electronics', '2026-11-04T10:51:01.678Z'),
  ('48818474-1c0f-477c-a410-e713fce65376', 'Mechanical Keyboard', 'RGB backlit mechanical keyboard with Cherry MX switches', '129.99', 75, 'Electronics', '2026-11-04T10:51:01.679Z'),
  ('574a47b6-f025-4420-afa3-5e992f0f677c', 'Cotton Crew-Neck T-Shirt', '100% organic cotton, available in multiple colors', '24.99', 300, 'Clothing', '2026-11-04T10:51:01.679Z'),
  ('8ece8b51-e341-41ad-aa32-d932a085d17c', 'Slim Fit Jeans', 'Stretch denim slim fit jeans', '49.99', 200, 'Clothing', '2026-11-04T10:51:01.680Z'),
  ('58072d75-e0bd-41aa-ba66-45afb65ebda1', 'Running Shoes', 'Lightweight breathable mesh running shoes', '89.99', 120, 'Clothing', '2026-11-04T10:51:01.680Z'),
  ('4ddc7a02-d400-4e4d-a80e-afb426dfc57a', 'Organic Green Tea (100 bags)', 'Premium Japanese organic green tea', '18.99', 400, 'Food', '2026-11-04T10:51:01.681Z'),
  ('7799921e-30a4-42c3-97bc-65670b75066f', 'Dark Chocolate Bar (72%)', 'Belgian dark chocolate, 200g bar', '5.99', 581, 'Food', '2026-11-04T10:51:01.682Z'),
  ('206c6ada-6613-4fc3-a395-21bd6e2ef56d', 'Extra Virgin Olive Oil (1L)', 'Cold-pressed Italian extra virgin olive oil', '14.99', 250, 'Food', '2026-11-04T10:51:01.683Z'),
  ('8f608803-ebb6-42eb-8810-842e0ffd6e7e', 'Stainless Steel Water Bottle', 'Insulated 750ml water bottle, keeps drinks cold 24h', '29.99', 179, 'Home', '2026-11-04T10:51:01.684Z'),
  ('a7e11172-e4eb-4197-81e9-0d804d6114d0', 'Scented Candle Set', 'Set of 3 soy wax candles – lavender, vanilla, citrus', '22.99', 219, 'Home', '2026-11-04T10:51:01.684Z'),
  ('46b6a2a4-bfbf-4cdb-98d1-ef5b199ce9fe', 'Yoga Mat', 'Non-slip 6mm thick exercise yoga mat', '34.99', 147, 'Sports', '2026-11-04T10:51:01.684Z'),
  ('dac7811b-92e9-4bd9-88de-b5fe27f9b401', 'Resistance Bands (5-pack)', 'Latex-free resistance bands with varying tensions', '19.99', 300, 'Sports', '2026-11-04T10:51:01.684Z'),
  ('d6fd420f-e9bc-4849-98b7-d030e9483d4f', 'Hardcover Notebook', 'A5 ruled hardcover notebook, 200 pages', '9.99', 450, 'Stationery', '2026-11-04T10:51:01.685Z'),
  ('c62b534d-ddd0-4f99-9feb-359b2e0a8fa6', 'Ballpoint Pen Set (10-pack)', 'Smooth-writing medium point pens, assorted colors', '7.99', 500, 'Stationery', '2026-11-04T10:51:01.685Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, customer_id, total_amount, status, notes, created_at, updated_at) VALUES
  ('95184f67-c143-4625-b50e-5d20ba3990ed', NULL, '68ced367-ac55-44f0-aaeb-dc5396813950', '231.92', 'processing', '', '2026-10-05T10:51:01.717Z', '2026-10-05T10:51:01.717Z'),
  ('e83c2ec5-14db-41cc-aa90-9dfd301d472f', NULL, '68ced367-ac55-44f0-aaeb-dc5396813950', '76.94', 'pending', 'Gift wrap requested', '2026-10-24T10:51:01.733Z', '2026-10-24T10:51:01.733Z'),
  ('13306bb2-7671-43f5-8e82-3f36c25951e8', NULL, '9dcc8f82-f430-49cb-9732-83cfa692eabd', '389.93', 'pending', 'Gift wrap requested', '2026-10-27T10:51:01.733Z', '2026-10-27T10:51:01.733Z'),
  ('605afbb1-ff45-4c22-8a11-31e5fd5cb4ee', NULL, '68ced367-ac55-44f0-aaeb-dc5396813950', '305.95', 'processing', 'Leave at the front door', '2026-09-10T10:51:01.733Z', '2026-09-10T10:51:01.733Z'),
  ('68b3c60e-b10e-45ea-87db-dec99bda94b3', NULL, 'e974320d-2bb1-4e11-917c-674060e3d7b8', '111.94', 'pending', 'Call before delivery', '2026-11-04T10:51:01.733Z', '2026-11-04T10:51:01.733Z'),
  ('910ab563-f440-48ec-846d-a835594a09a1', NULL, 'e974320d-2bb1-4e11-917c-674060e3d7b8', '91.96', 'processing', 'Leave at the front door', '2026-09-09T10:51:01.733Z', '2026-09-09T10:51:01.733Z'),
  ('3d5a7008-5c3e-474f-b8f1-d07c3570c289', NULL, 'a4d7e7a1-8250-49c5-aa7a-08382050c4eb', '29.98', 'pending', '', '2026-09-08T10:51:01.733Z', '2026-09-08T10:51:01.733Z'),
  ('b5905d17-1967-4280-ae01-bc2c07001e0a', NULL, 'b26f5eac-6f55-4ace-9640-cf5592788ede', '784.90', 'cancelled', 'Leave at the front door', '2026-11-02T10:51:01.733Z', '2026-11-02T10:51:01.733Z'),
  ('35d03daa-bbf3-43f5-8b67-2c6b32e37f7e', NULL, '2e068590-37c8-40f9-9e51-64991f5596e9', '25.97', 'processing', 'Gift wrap requested', '2026-10-26T10:51:01.733Z', '2026-10-26T10:51:01.733Z'),
  ('6f870e99-e1ef-461e-82fc-59a9bce5d92d', NULL, '68ced367-ac55-44f0-aaeb-dc5396813950', '23.96', 'completed', 'Fragile items inside', '2026-10-07T10:51:01.733Z', '2026-10-07T10:51:01.733Z'),
  ('d89f977a-ab28-4910-b24d-123c3e007108', NULL, '540b1261-3322-467b-8887-25146a2be50e', '229.94', 'pending', '', '2026-09-16T10:51:01.733Z', '2026-09-16T10:51:01.733Z'),
  ('942a2018-ea5d-45eb-97b8-fdf8011cd559', NULL, 'f4343b2a-6992-42fb-92c7-07cec0f9ceee', '285.95', 'processing', 'Leave at the front door', '2026-10-25T10:51:01.733Z', '2026-10-25T10:51:01.733Z'),
  ('86100714-2f2c-4f3d-8140-39158c4f7023', NULL, 'a4d7e7a1-8250-49c5-aa7a-08382050c4eb', '367.92', 'processing', 'Please deliver before noon', '2026-09-19T10:51:01.733Z', '2026-09-19T10:51:01.733Z'),
  ('9d9bac12-5214-4630-a338-f181f5be983e', NULL, '10ab428d-2026-498a-968e-f3af218c82c6', '159.94', 'cancelled', 'Leave at the front door', '2026-09-23T10:51:01.733Z', '2026-09-23T10:51:01.733Z'),
  ('763c3c1c-2649-40aa-9298-6d6930e4d2cc', NULL, 'f4343b2a-6992-42fb-92c7-07cec0f9ceee', '405.94', 'pending', 'Please deliver before noon', '2026-10-18T10:51:01.733Z', '2026-10-18T10:51:01.733Z'),
  ('d91de4da-c170-40a6-9881-a830fdf993ed', NULL, '540b1261-3322-467b-8887-25146a2be50e', '41.95', 'completed', 'Gift wrap requested', '2026-11-03T10:51:01.733Z', '2026-11-03T10:51:01.733Z'),
  ('bbd2bea7-a6b5-4b43-8baf-9fc94994098b', NULL, '9b553992-cac8-4f21-b5ef-552ddb12fa7b', '123.92', 'cancelled', 'Call before delivery', '2026-09-25T10:51:01.733Z', '2026-09-25T10:51:01.733Z'),
  ('fb3fc67e-e1f4-480c-a91f-d7fb0022f5c5', NULL, 'b26f5eac-6f55-4ace-9640-cf5592788ede', '395.96', 'pending', 'Call before delivery', '2026-10-22T10:51:01.733Z', '2026-10-22T10:51:01.733Z'),
  ('b242acbe-956e-4e56-b130-7f88419a9b2a', NULL, '68ced367-ac55-44f0-aaeb-dc5396813950', '22.99', 'cancelled', 'Fragile items inside', '2026-10-29T10:51:01.734Z', '2026-10-29T10:51:01.734Z'),
  ('943ed215-b073-4982-80a7-daeac5ec63b2', NULL, 'b26f5eac-6f55-4ace-9640-cf5592788ede', '91.96', 'processing', '', '2026-11-03T10:51:01.734Z', '2026-11-03T10:51:01.734Z'),
  ('bc0c08ae-f5f3-42d7-be9f-f3c60d4a49b5', 'b1e1027a-4d7d-41a1-8f5b-554beb814050', '2f3a71a2-0f02-44af-bce4-00c2b3bba41a', '29.99', 'pending', '', '2026-11-05T07:40:32.458Z', '2026-11-05T07:40:32.458Z'),
  ('f19fe51c-65df-4a5b-b60b-a299a9337fb9', 'ad81ea45-a756-4091-9dd5-1feed99a1f6f', 'e974320d-2bb1-4e11-917c-674060e3d7b8', '79.99', 'pending', '', '2026-11-05T07:59:26.083Z', '2026-11-05T07:59:26.083Z'),
  ('6ab316b0-7ab5-47b6-91be-cdc0920a3d9c', 'f12c7dfa-9995-4b84-a77a-72b118bfbbb3', 'ec0c6882-6659-48b3-bec9-f9eb8c69ecae', '22.99', 'completed', '', '2026-11-05T08:25:42.119Z', '2026-11-05T08:27:21.167Z'),
  ('86ad47c1-b208-42ea-ad9c-270fb19457e6', 'f12c7dfa-9995-4b84-a77a-72b118bfbbb3', 'ec0c6882-6659-48b3-bec9-f9eb8c69ecae', '533.69', 'pending', '', '2026-11-05T08:29:16.812Z', '2026-11-05T08:29:16.812Z'),
  ('b910dd9f-90b3-4522-99aa-d74132d91af1', 'b5dde465-8407-4703-ab24-14b1479f4982', '3e3155bd-61d7-4ad7-8f04-dd06a4facf91', '34.99', 'pending', '', '2026-11-05T08:29:59.658Z', '2026-11-05T08:29:59.658Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at) VALUES
  ('f59a8d91-0e5f-44e1-b80a-d6e2ff108821', '95184f67-c143-4625-b50e-5d20ba3990ed', '49feb184-b833-4c6c-a80b-7d2842cc4131', 4, '12.99', '2026-10-05T10:51:01.717Z'),
  ('89a02726-694b-491e-b550-0264a3dc7686', '95184f67-c143-4625-b50e-5d20ba3990ed', '8f608803-ebb6-42eb-8810-842e0ffd6e7e', 1, '29.99', '2026-10-05T10:51:01.717Z'),
  ('f5b71c2c-f3ac-4d63-a5c1-9078403d187f', '95184f67-c143-4625-b50e-5d20ba3990ed', '8ece8b51-e341-41ad-aa32-d932a085d17c', 3, '49.99', '2026-10-05T10:51:01.717Z'),
  ('f54d8430-42cd-491b-8feb-b388a3755e0e', 'e83c2ec5-14db-41cc-aa90-9dfd301d472f', '7799921e-30a4-42c3-97bc-65670b75066f', 4, '5.99', '2026-10-24T10:51:01.733Z'),
  ('cd973ee2-c36b-4ee5-8c30-c18006ca91e9', 'e83c2ec5-14db-41cc-aa90-9dfd301d472f', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 1, '22.99', '2026-10-24T10:51:01.733Z'),
  ('3340e747-45cc-4fa3-8e8a-09583c2478ac', 'e83c2ec5-14db-41cc-aa90-9dfd301d472f', '8f608803-ebb6-42eb-8810-842e0ffd6e7e', 1, '29.99', '2026-10-24T10:51:01.733Z'),
  ('94d8e330-446e-4786-8e0b-d5f4564eca32', '13306bb2-7671-43f5-8e82-3f36c25951e8', 'd6fd420f-e9bc-4849-98b7-d030e9483d4f', 3, '9.99', '2026-10-27T10:51:01.733Z'),
  ('f4a0da31-6ca3-41d3-9eaa-84476e30af4b', '13306bb2-7671-43f5-8e82-3f36c25951e8', '58072d75-e0bd-41aa-ba66-45afb65ebda1', 4, '89.99', '2026-10-27T10:51:01.733Z'),
  ('5826b77a-5130-4d7c-8e4d-5e412c8ebc10', '605afbb1-ff45-4c22-8a11-31e5fd5cb4ee', 'c62b534d-ddd0-4f99-9feb-359b2e0a8fa6', 2, '7.99', '2026-09-10T10:51:01.733Z'),
  ('d4193fd4-efb0-46b5-9d12-d11289bd0f61', '605afbb1-ff45-4c22-8a11-31e5fd5cb4ee', '48818474-1c0f-477c-a410-e713fce65376', 2, '129.99', '2026-09-10T10:51:01.733Z'),
  ('15bcc525-eba0-4645-941f-6959cfa36f3f', '605afbb1-ff45-4c22-8a11-31e5fd5cb4ee', '8f608803-ebb6-42eb-8810-842e0ffd6e7e', 1, '29.99', '2026-09-10T10:51:01.733Z'),
  ('ed1c9a08-3553-4648-be53-c0b6fb921b89', '68b3c60e-b10e-45ea-87db-dec99bda94b3', 'dac7811b-92e9-4bd9-88de-b5fe27f9b401', 2, '19.99', '2026-11-04T10:51:01.733Z'),
  ('9b659a1e-b76c-4226-b9e0-ceba4c869f2b', '68b3c60e-b10e-45ea-87db-dec99bda94b3', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 2, '22.99', '2026-11-04T10:51:01.733Z'),
  ('990d90a0-b9d2-4bb2-bfde-fe637d8d4578', '68b3c60e-b10e-45ea-87db-dec99bda94b3', '49feb184-b833-4c6c-a80b-7d2842cc4131', 2, '12.99', '2026-11-04T10:51:01.733Z'),
  ('03569c41-20f5-4e01-8806-3252f90c493c', '910ab563-f440-48ec-846d-a835594a09a1', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 4, '22.99', '2026-09-09T10:51:01.733Z'),
  ('478be98f-68d5-452a-ad6a-64fba9411cdd', '3d5a7008-5c3e-474f-b8f1-d07c3570c289', '206c6ada-6613-4fc3-a395-21bd6e2ef56d', 2, '14.99', '2026-09-08T10:51:01.733Z'),
  ('de528979-ae2e-48cb-b066-8d6c137333ae', 'b5905d17-1967-4280-ae01-bc2c07001e0a', '574a47b6-f025-4420-afa3-5e992f0f677c', 3, '24.99', '2026-11-02T10:51:01.733Z'),
  ('a043e509-0f0c-4012-8af6-1f73e6a9b142', 'b5905d17-1967-4280-ae01-bc2c07001e0a', '82ecf540-be92-47d7-ac9b-242e8dcdd532', 4, '79.99', '2026-11-02T10:51:01.733Z'),
  ('e8c20535-7c1c-4ce9-9d86-b2e6c7edd320', 'b5905d17-1967-4280-ae01-bc2c07001e0a', '48818474-1c0f-477c-a410-e713fce65376', 3, '129.99', '2026-11-02T10:51:01.733Z'),
  ('1ae6109f-00ab-412a-af77-76840336408c', '35d03daa-bbf3-43f5-8b67-2c6b32e37f7e', 'd6fd420f-e9bc-4849-98b7-d030e9483d4f', 2, '9.99', '2026-10-26T10:51:01.733Z'),
  ('7d6ea3b6-66ac-472b-81a5-fb5ffcf75504', '35d03daa-bbf3-43f5-8b67-2c6b32e37f7e', '7799921e-30a4-42c3-97bc-65670b75066f', 1, '5.99', '2026-10-26T10:51:01.733Z'),
  ('59aefcfb-8dec-4108-a75b-8f70f095d380', '6f870e99-e1ef-461e-82fc-59a9bce5d92d', '7799921e-30a4-42c3-97bc-65670b75066f', 4, '5.99', '2026-10-07T10:51:01.733Z'),
  ('c5eb5fbb-00eb-4f39-8921-f0d8edf1ee6d', 'd89f977a-ab28-4910-b24d-123c3e007108', '206c6ada-6613-4fc3-a395-21bd6e2ef56d', 2, '14.99', '2026-09-16T10:51:01.733Z'),
  ('59d7cffa-4db5-452f-a13c-83c9b59662d3', 'd89f977a-ab28-4910-b24d-123c3e007108', '8ece8b51-e341-41ad-aa32-d932a085d17c', 4, '49.99', '2026-09-16T10:51:01.733Z'),
  ('dd127766-6696-47be-9f50-48755bbf5f9a', '942a2018-ea5d-45eb-97b8-fdf8011cd559', 'c62b534d-ddd0-4f99-9feb-359b2e0a8fa6', 2, '7.99', '2026-10-25T10:51:01.733Z'),
  ('2d23ca3a-78ce-4f64-b2eb-4cd4b2f8617f', '942a2018-ea5d-45eb-97b8-fdf8011cd559', '58072d75-e0bd-41aa-ba66-45afb65ebda1', 3, '89.99', '2026-10-25T10:51:01.733Z'),
  ('2f74968e-5636-4234-96cd-81e2711f9ae6', '86100714-2f2c-4f3d-8140-39158c4f7023', '82ecf540-be92-47d7-ac9b-242e8dcdd532', 3, '79.99', '2026-09-19T10:51:01.733Z'),
  ('dcdf78d4-57c3-44e0-bea5-bc6f1a74b223', '86100714-2f2c-4f3d-8140-39158c4f7023', '8f608803-ebb6-42eb-8810-842e0ffd6e7e', 3, '29.99', '2026-09-19T10:51:01.733Z'),
  ('860e6f6f-19ad-43da-a459-abd1c12f92fd', '86100714-2f2c-4f3d-8140-39158c4f7023', '4ddc7a02-d400-4e4d-a80e-afb426dfc57a', 2, '18.99', '2026-09-19T10:51:01.733Z'),
  ('b021cd36-cc35-4cd9-a7e9-341708578bdb', '9d9bac12-5214-4630-a338-f181f5be983e', '206c6ada-6613-4fc3-a395-21bd6e2ef56d', 4, '14.99', '2026-09-23T10:51:01.733Z'),
  ('ce292c80-b999-4d69-84e5-c2e4ee580f20', '9d9bac12-5214-4630-a338-f181f5be983e', '8ece8b51-e341-41ad-aa32-d932a085d17c', 2, '49.99', '2026-09-23T10:51:01.733Z'),
  ('8ae9e81a-c267-4e78-8406-40712e02ed6b', '763c3c1c-2649-40aa-9298-6d6930e4d2cc', '58072d75-e0bd-41aa-ba66-45afb65ebda1', 4, '89.99', '2026-10-18T10:51:01.733Z'),
  ('51f58f8f-85a5-4b43-bd42-958d264cac99', '763c3c1c-2649-40aa-9298-6d6930e4d2cc', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 2, '22.99', '2026-10-18T10:51:01.733Z'),
  ('d93a1216-e0f9-4487-b9e6-92098dc849f8', 'd91de4da-c170-40a6-9881-a830fdf993ed', '7799921e-30a4-42c3-97bc-65670b75066f', 2, '5.99', '2026-11-03T10:51:01.733Z'),
  ('1dfbe548-9f75-46f0-b64b-604b627c9720', 'd91de4da-c170-40a6-9881-a830fdf993ed', 'd6fd420f-e9bc-4849-98b7-d030e9483d4f', 3, '9.99', '2026-11-03T10:51:01.733Z'),
  ('5952e8d3-87df-4a2a-93dd-32e27279f503', 'bbd2bea7-a6b5-4b43-8baf-9fc94994098b', '574a47b6-f025-4420-afa3-5e992f0f677c', 4, '24.99', '2026-09-25T10:51:01.733Z'),
  ('67ab52e7-7d7e-4e78-bdcf-98b56c87c525', 'bbd2bea7-a6b5-4b43-8baf-9fc94994098b', '7799921e-30a4-42c3-97bc-65670b75066f', 4, '5.99', '2026-09-25T10:51:01.733Z'),
  ('f74532a0-a8d9-4843-80db-645b5bf34818', 'fb3fc67e-e1f4-480c-a91f-d7fb0022f5c5', '7799921e-30a4-42c3-97bc-65670b75066f', 1, '5.99', '2026-10-22T10:51:01.733Z'),
  ('fbdc714b-6880-4597-a870-5dcd3096259b', 'fb3fc67e-e1f4-480c-a91f-d7fb0022f5c5', '48818474-1c0f-477c-a410-e713fce65376', 3, '129.99', '2026-10-22T10:51:01.733Z'),
  ('8de7802d-b503-4349-a03c-0156a9dda07c', 'b242acbe-956e-4e56-b130-7f88419a9b2a', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 1, '22.99', '2026-10-29T10:51:01.734Z'),
  ('6021a0c4-18bb-4dac-bde3-f0d95540b04b', '943ed215-b073-4982-80a7-daeac5ec63b2', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 4, '22.99', '2026-11-03T10:51:01.734Z'),
  ('60091d5e-7224-448c-8258-5901d9f34553', 'bc0c08ae-f5f3-42d7-be9f-f3c60d4a49b5', '8f608803-ebb6-42eb-8810-842e0ffd6e7e', 1, '29.99', '2026-11-05T07:40:32.458Z'),
  ('79b66170-69a3-4048-b516-c37f60fd9dc5', 'f19fe51c-65df-4a5b-b60b-a299a9337fb9', '82ecf540-be92-47d7-ac9b-242e8dcdd532', 1, '79.99', '2026-11-05T07:59:26.083Z'),
  ('9d0957c6-5fbe-4616-9fc1-046d50d19d54', '6ab316b0-7ab5-47b6-91be-cdc0920a3d9c', 'a7e11172-e4eb-4197-81e9-0d804d6114d0', 1, '22.99', '2026-11-05T08:25:42.119Z'),
  ('610f46af-e5b5-47de-82db-5a3f636d7523', '86ad47c1-b208-42ea-ad9c-270fb19457e6', '46b6a2a4-bfbf-4cdb-98d1-ef5b199ce9fe', 12, '34.99', '2026-11-05T08:29:16.812Z'),
  ('99159d29-7312-4ff4-a677-146e8c0daccb', '86ad47c1-b208-42ea-ad9c-270fb19457e6', '7799921e-30a4-42c3-97bc-65670b75066f', 19, '5.99', '2026-11-05T08:29:16.812Z'),
  ('18b44910-cf90-410e-84ca-e8f3c53ae5e1', 'b910dd9f-90b3-4522-99aa-d74132d91af1', '46b6a2a4-bfbf-4cdb-98d1-ef5b199ce9fe', 1, '34.99', '2026-11-05T08:29:59.658Z')
ON CONFLICT (id) DO NOTHING;

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
