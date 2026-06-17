import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import Navbar from "./Navbar";

export default function ProtectedLayout() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="grain-layer flex min-h-screen flex-col bg-base">
      <Navbar />
      <div className="relative z-10 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
