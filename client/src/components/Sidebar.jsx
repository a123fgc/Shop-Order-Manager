// import { useState } from 'react';
// import { NavLink, useLocation } from 'react-router-dom';
// import {
//   LayoutDashboard,
//   Users,
//   Package,
//   ShoppingCart,
//   BarChart3,
//   ChevronLeft,
//   ChevronRight,
//   Store,
// } from 'lucide-react';

// const navItems = [
//   { to: '/', label: 'Dashboard', icon: LayoutDashboard },
//   { to: '/customers', label: 'Customers', icon: Users },
//   { to: '/products', label: 'Products', icon: Package },
//   { to: '/orders', label: 'Orders', icon: ShoppingCart },
//   { to: '/reports', label: 'Reports', icon: BarChart3 },
// ];

// export default function Sidebar() {
//   const [collapsed, setCollapsed] = useState(false);
//   const location = useLocation();

//   return (
//     <aside
//       className={`${
//         collapsed ? 'w-20' : 'w-64'
//       } bg-gray-900 text-white min-h-screen flex flex-col transition-all duration-300 ease-in-out`}
//     >
//       {/* Logo / Title */}
//       <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
//         <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
//           <Store className="w-6 h-6 text-white" />
//         </div>
//         {!collapsed && (
//           <span className="text-lg font-bold tracking-tight whitespace-nowrap">
//             Shop Manager
//           </span>
//         )}
//       </div>

//       {/* Navigation */}
//       <nav className="flex-1 py-4 space-y-1 px-3">
//         {navItems.map(({ to, label, icon: Icon }) => {
//           const isActive =
//             to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

//           return (
//             <NavLink
//               key={to}
//               to={to}
//               className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group ${
//                 isActive
//                   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
//                   : 'text-gray-400 hover:text-white hover:bg-gray-800'
//               }`}
//             >
//               <Icon className="w-5 h-5 flex-shrink-0" />
//               {!collapsed && (
//                 <span className="text-sm font-medium whitespace-nowrap">{label}</span>
//               )}
//             </NavLink>
//           );
//         })}
//       </nav>

//       {/* Collapse Toggle */}
//       <div className="border-t border-gray-700 p-3">
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-200"
//         >
//           {collapsed ? (
//             <ChevronRight className="w-5 h-5" />
//           ) : (
//             <>
//               <ChevronLeft className="w-5 h-5 mr-2" />
//               <span className="text-sm font-medium">Collapse</span>
//             </>
//           )}
//         </button>
//       </div>
//     </aside>
//   );
// }

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },

    ...(isAdmin
      ? [
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ]
      : []),

    { to: '/products', label: 'Products', icon: Package },
    { to: '/orders', label: 'Orders', icon: ShoppingCart },
  ];

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'
        } bg-gray-900 text-white min-h-screen flex flex-col transition-all duration-300`}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Store className="w-6 h-6" />
        </div>

        {!collapsed && (
          <span className="text-lg font-bold">
            Shop Manager
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />

              {!collapsed && (
                <span className="text-sm font-medium">
                  {label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
