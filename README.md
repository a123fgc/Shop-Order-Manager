# Shop Order Manager

A full-stack web application for managing shop orders, customers, products, and generating business reports. Built with React (Vite) + Tailwind CSS on the frontend and Node.js/Express + MongoDB on the backend.

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
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Auth (register/login)
│   │   ├── customerController.js  # Customer CRUD
│   │   ├── productController.js   # Product CRUD
│   │   ├── orderController.js     # Order CRUD
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
│   ├── scripts/
│   │   └── seed.js                # Database seeder
│   ├── .env                       # Environment variables
│   ├── server.js                  # Express app entry
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ 
- **MongoDB** running locally on port 27017 (or update `.env` with your connection string)

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

4. **Configure environment variables**
   
   Edit `server/.env` and update values as needed:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/shop_order_manager
   JWT_SECRET=your_jwt_secret_key_change_this
   NODE_ENV=development
   ```

5. **Seed the database** (optional — adds sample data)
   ```bash
   cd server
   node scripts/seed.js
   ```

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

## ✨ Features

- **Authentication** — JWT-based login & registration
- **Dashboard** — Key metrics, sales charts, recent orders
- **Customer Management** — Full CRUD with search & pagination
- **Product Management** — Full CRUD with categories, stock tracking
- **Order Management** — Create orders with multiple items, status tracking, auto stock updates
- **Reports & Analytics** — Sales trends, top products, top customers with interactive charts

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS        |
| Icons      | Lucide React                        |
| Charts     | Recharts                            |
| Backend    | Node.js, Express                    |
| Database   | MongoDB, Mongoose                   |
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

