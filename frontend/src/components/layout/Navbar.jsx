import { Link, useNavigate } from "react-router-dom";
import { BookOpen, LogOut } from "lucide-react";
import useAuthStore from "../../store/authStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="relative z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Link to="/" className="flex items-center gap-2 text-text-main">
        <BookOpen className="text-primary" size={22} />
        <span className="text-lg font-semibold tracking-tight">DocMind</span>
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-text-muted">{user.username}</span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-main"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
}
