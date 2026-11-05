# Shop Order Manager

A full-stack web application for managing shop orders, customers, products, and generating business reports. Built with React (Vite) + Tailwind CSS on the frontend and Node.js/Express + PostgreSQL on the backend.

## 📁 Project Structure

```
shop-order-manager/
│
├── client/                    # React Frontend (Vite)
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── Sidebar.jsx        # Navigation sidebar
│       │   ├── Navbar.jsx         # Top navigation bar
│       │   ├── DataTable.jsx      # Reusable data table
│       │   └── ProtectedRoute.jsx # Auth route guard
│       │
│       ├── pages/
│       │   ├── Login.jsx          # Login & registration
│       │   ├── Dashboard.jsx      # Dashboard with stats & charts
│       │   ├── Customers.jsx      # Customer management (CRUD)
│       │   ├── Products.jsx       # Product management (CRUD)
│       │   ├── Orders.jsx         # Order listing & management
│       │   ├── CreateOrder.jsx    # Create new order form
│       │   └── Reports.jsx        # Business reports & analytics
│       │
│       ├── services/
│       │   └── api.js             # Axios API client
│       ├── context/
│       │   └── AuthContext.jsx    # Authentication context
│       ├── App.jsx                # App routes & layout
│       └── main.jsx               # Entry point
│
├── server/                    # Express Backend
│   ├── config/
│   │   └── db.js                  # PostgreSQL pool & connection
│   ├── db/
│   │   └── schema.sql             # PostgreSQL tables & indexes
│   ├── controllers/
│   │   ├── authController.js      # Auth (register/login)
│   │   ├── customerController.js  # Customer CRUD
│   │   ├── productController.js   # Product CRUD
│   │   ├── orderController.js     # Order CRUD (transactions + stock)
│   │   └── reportController.js    # Reports & analytics
│   │
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT authentication
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── reportRoutes.js
│   │
│   ├── seeds/
│   │   ├── seed.js                # Sample data seeder
│   │   ├── import-data.js         # MongoDB JSON → PostgreSQL importer
│   │   ├── init-db.js             # Schema initializer
│   │   └── data/
│   │       └── mongo-export.json  # Existing MongoDB data snapshot
│   │
│   ├── utils/
│   │   ├── mappers.js             # SQL rows → API response shape
│   │   ├── orderQueries.js        # Shared order SQL fragments
│   │   └── validators.js          # UUID / number / date helpers
│   │
│   ├── .env                       # Environment variables
│   ├── server.js                  # Express app entry
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** v13+ running locally on port 5432 (or a hosted PostgreSQL/Supabase database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd shop-order-manager
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Create the PostgreSQL database**
   ```bash
   createdb shop_order_manager
   ```
   Or, from `psql`:
   ```sql
   CREATE DATABASE shop_order_manager;
   ```

5. **Configure environment variables**

   Copy `server/.env.example` to `server/.env` and update the values:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shop_order_manager
   PGSSL=false
   PG_AUTO_MIGRATE=true
   JWT_SECRET=replace_this_with_a_long_random_secret
   NODE_ENV=development
   ```

   For a hosted database (Supabase, Render, Railway, etc.) use the connection
   string provided by the host and add `?sslmode=require` if necessary:
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
   ```

6. **Create the schema**

   The schema is also created automatically when the server starts. To run it
   explicitly:
   ```bash
   cd server
   npm run db:init
   ```

7. **Load data** (choose one)

   **Option A — Import the existing MongoDB data** (included as a snapshot):
   ```bash
   cd server
   npm run migrate:data
   ```
   This imports `server/seeds/data/mongo-export.json`, preserves all
   relationships, and replaces any existing data in the PostgreSQL tables.

   To import a different snapshot:
   ```bash
   npm run migrate:data -- path/to/export.json
   ```

   **Option B — Seed fresh sample data**:
   ```bash
   cd server
   npm run seed
   ```

   **Option C — No `DATABASE_URL` yet? Use the Supabase SQL Editor**:
   ```bash
   cd server
   npm run gen:supabase-sql
   ```
   This writes `server/db/supabase-setup.sql` (schema + all exported data).
   Open your Supabase project → **SQL Editor** → **New query**, paste the file,
   and click **Run**. The tables and rows are created in one step.

   > If the database already contains tables created by hand with different
   > column types, `CREATE TABLE IF NOT EXISTS` will skip them and foreign keys
   > will fail. Start clean with `npm run db:reset -- --yes` (destructive) and
   > then `npm run db:init`.

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on `http://localhost:5000`

2. **Start the frontend dev server**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on `http://localhost:5173`

3. **Open your browser** and go to `http://localhost:5173`

### Default Login (after seeding)

- **Email:** `admin@example.com`
- **Password:** `admin123`

If you imported the existing MongoDB snapshot, log in with your existing
MongoDB credentials (the snapshot contains the same users and password hashes).

## ☁️ Deploying with Supabase

Supabase provides a hosted PostgreSQL database, so no local PostgreSQL
installation is required.

1. **Create a Supabase project** at <https://supabase.com/dashboard>.

2. **Copy the PostgreSQL connection string**

   Open **Project Settings → Database → Connection string → URI**.

   Use the **Session pooler** connection string (port `5432`) for this Express
   backend, and make sure it ends with `?sslmode=require`:

   ```env
   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   > The dashboard's copy button gives you the exact values. Avoid committing
   > this string anywhere — it contains your database password.

3. **Update `server/.env`**

   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
   PGSSL=true
   PG_POOL_MAX=1
   PG_AUTO_MIGRATE=true
   JWT_SECRET=replace_this_with_a_long_random_secret
   NODE_ENV=production
   ```

4. **Create the tables and import your MongoDB data**

   **Option A — from your machine** (needs `DATABASE_URL`):

   ```bash
   cd server
   npm run db:init
   npm run migrate:data
   ```

   **Option B — straight from the Supabase dashboard** (no `DATABASE_URL`):

   ```bash
   cd server
   npm run gen:supabase-sql
   ```

   Then open **SQL Editor → New query**, paste
   `server/db/supabase-setup.sql`, and click **Run**. It creates the five
   tables and inserts the exported MongoDB rows (4 users, 13 customers,
   15 products, 25 orders) with matching UUIDs.

   > Re-running it drops the five tables first, so it is for fresh databases
   > only. If tables already exist with `bigint` ids (Supabase's Table Editor
   > default), the setup file clears them before rebuilding.

5. **Add the same environment variables to Vercel** (or your backend host)

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Supabase connection string |
   | `PGSSL` | `true` |
   | `PG_POOL_MAX` | `1` |
   | `PG_AUTO_MIGRATE` | `false` after the first deploy |
   | `JWT_SECRET` | A long random secret |

   Then redeploy the backend. The React client talks to the Express API, so no
   Supabase keys are needed in the frontend.

## 🔄 Migrating from MongoDB

The backend no longer uses MongoDB or Mongoose. The live MongoDB collections
were exported to `server/seeds/data/mongo-export.json`:

| MongoDB collection | PostgreSQL table |
|--------------------|------------------|
| `users`            | `users`          |
| `customers`        | `customers`      |
| `products`         | `products`       |
| `orders`           | `orders` + `order_items` |

The importer maps every old MongoDB `ObjectId` to a new PostgreSQL `UUID`, so
customer, user, product, and order relationships are preserved. MongoDB
embedded order items become rows in the `order_items` table.

## ✨ Features

- **Authentication** — JWT-based login & registration
- **Dashboard** — Key metrics, sales charts, recent orders
- **Customer Management** — Full CRUD with search & pagination
- **Product Management** — Full CRUD with categories, stock tracking
- **Order Management** — Create orders with multiple items, status tracking, automatic stock updates inside database transactions
- **Reports & Analytics** — Sales trends, top products, top customers with interactive charts

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS        |
| Icons      | Lucide React                        |
| Charts     | Recharts                            |
| Backend    | Node.js, Express                    |
| Database   | PostgreSQL, `pg`                    |
| Auth       | JWT (jsonwebtoken), bcryptjs        |

## 📄 API Endpoints

| Method | Endpoint                 | Description              | Auth |
|--------|--------------------------|--------------------------|------|
| POST   | `/api/auth/register`     | Register new user        | No   |
| POST   | `/api/auth/login`        | Login                    | No   |
| GET    | `/api/auth/me`           | Get current user         | Yes  |
| GET    | `/api/customers`         | List customers           | Yes  |
| POST   | `/api/customers`         | Create customer          | Yes  |
| GET    | `/api/customers/:id`     | Get single customer      | Yes  |
| PUT    | `/api/customers/:id`     | Update customer          | Yes  |
| DELETE | `/api/customers/:id`     | Delete customer          | Yes  |
| GET    | `/api/products`          | List products            | Yes  |
| POST   | `/api/products`          | Create product           | Yes  |
| GET    | `/api/products/:id`      | Get single product       | Yes  |
| PUT    | `/api/products/:id`      | Update product           | Yes  |
| DELETE | `/api/products/:id`      | Delete product           | Yes  |
| GET    | `/api/orders`            | List orders              | Yes  |
| POST   | `/api/orders`            | Create order             | Yes  |
| GET    | `/api/orders/:id`        | Get single order         | Yes  |
| PUT    | `/api/orders/:id`        | Update order             | Yes  |
| DELETE | `/api/orders/:id`        | Delete order             | Yes  |
| GET    | `/api/reports/dashboard` | Dashboard statistics     | Yes  |
| GET    | `/api/reports/sales`     | Sales report             | Yes  |
| GET    | `/api/reports/top-products`  | Top selling products | Yes  |
| GET    | `/api/reports/top-customers` | Top customers        | Yes  |

## 📝 License

MIT
