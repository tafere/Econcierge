import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, ConciergeBell } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 bg-brand-700 rounded-xl mb-4 shadow-lg">
            <ConciergeBell className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Econcierge</h1>
          <p className="text-sm text-stone-500 mt-1">Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full h-11 border border-stone-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-11 border border-stone-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-brand-700 text-white rounded-lg font-semibold text-sm
              hover:bg-brand-800 transition-colors flex items-center justify-center gap-2
              disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
