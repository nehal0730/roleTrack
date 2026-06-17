import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props { children: React.ReactNode; roles?: string[] }

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, role } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role()!)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}