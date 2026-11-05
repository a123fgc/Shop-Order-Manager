// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { Loader2 } from 'lucide-react';

// export default function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
//       </div>
//     );
//   }

//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   return children;
// }

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
