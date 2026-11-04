import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/products': 'Products',
  '/orders': 'Orders',
  '/orders/create': 'Create Order',
  '/reports': 'Reports',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const title =
    pageTitles[location.pathname] ||
    Object.entries(pageTitles).find(([path]) => location.pathname.startsWith(path))?.[1] ||
    'Shop Manager';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-medium hidden sm:inline">{user?.name || 'User'}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
