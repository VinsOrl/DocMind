import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen } from "lucide-react";
import api from "../api/client";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.access_token, data.user);
      toast.success(`Welcome back, ${data.user.username}`);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain-layer flex min-h-screen items-center justify-center bg-base px-4">
      <div className="card grain-light relative w-full max-w-sm p-8">
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="text-primary" size={26} />
            <h1 className="text-xl font-semibold text-text-main">DocMind</h1>
          </div>
          <h2 className="mb-1 text-lg font-medium text-text-main">Sign in</h2>
          <p className="mb-6 text-sm text-text-muted">
            Ask questions about your documents.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-muted">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-text-muted">
            No account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
