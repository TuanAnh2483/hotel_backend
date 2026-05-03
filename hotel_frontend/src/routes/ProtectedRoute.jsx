import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// role — optional; if provided, the user's userType must match exactly.
// Unauthenticated users are sent to /login with the current location saved
// so LoginPage can redirect them back after a successful login.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.userType !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
