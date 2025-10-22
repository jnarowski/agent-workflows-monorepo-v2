import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/client/contexts/AuthContext";

function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AuthLayout;
