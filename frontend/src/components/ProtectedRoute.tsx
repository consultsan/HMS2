import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'SUPER_ADMIN':
        return <Navigate to="/super-admin/dashboard" replace />;
      case 'HOSPITAL_ADMIN':
        return <Navigate to="/hospital-admin/dashboard" replace />;
      case 'RECEPTIONIST':
        return <Navigate to="/receptionist/dashboard" replace />;
      case 'SALES_PERSON':
        return <Navigate to="/sales/dashboard" replace />;
      case 'DOCTOR':
        return <Navigate to="/doctor/dashboard" replace />;
      // Add more cases for other roles as needed
      default:
        return <Navigate to="/hospital-admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
} 