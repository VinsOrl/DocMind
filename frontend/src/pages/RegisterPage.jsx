import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen } from "lucide-react";
import api from "../api/client";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      toast.success("Account created — please log in");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
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
          <h2 className="mb-1 text-lg font-medium text-text-main">
            Create account
          </h2>
          <p className="mb-6 text-sm text-text-muted">Get started in seconds.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-text-muted">
                Username
              </label>
              <input
                required
                value={form.username}
                onChange={update("username")}
                className="input-field"
                placeholder="yourname"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-muted">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
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
                value={form.password}
                onChange={update("password")}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-muted">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={update("confirm")}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating…" : "Register"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
