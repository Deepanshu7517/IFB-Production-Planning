import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem('production_user');
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;