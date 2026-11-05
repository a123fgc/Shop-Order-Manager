
import { Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import Reports from './pages/Reports';

// Authenticated Layout
function AuthenticatedLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Customers - Admin Only */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute adminOnly={true}>
              <AuthenticatedLayout>
                <Customers />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Products */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Products />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Orders />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Create Order */}
        <Route
          path="/orders/create"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <CreateOrder />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Reports - Admin Only */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute adminOnly={true}>
              <AuthenticatedLayout>
                <Reports />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </AuthProvider>
  );
}
