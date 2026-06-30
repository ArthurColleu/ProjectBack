import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Chargement…</div>;
  if (!user) return <Navigate to="/connexion" replace />;
  return <Outlet />;
}
