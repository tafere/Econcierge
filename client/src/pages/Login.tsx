import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, ConciergeBell, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">

      {/* Icon + title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-brand-600 rounded-2xl mb-5
          shadow-lg shadow-brand-200">
          <ConciergeBell className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 leading-tight">
          Digital Concierge
        </h1>
        <p className="text-2xl font-black text-brand-600 leading-tight">Management System</p>
        <p className="text-slate-400 text-sm mt-2 tracking-wide">Staff Management Portal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Card header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
          <p className="text-slate-400 text-sm mt-1">Enter your credentials to access the portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full h-12 bg-slate-100 rounded-xl px-4 text-sm text-slate-900
                placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full h-12 bg-slate-100 rounded-xl px-4 pr-11 text-sm text-slate-900
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                  focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                  transition-colors"
              >
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold
              text-sm flex items-center justify-center gap-2.5 transition-colors
              disabled:opacity-50 shadow-md shadow-brand-200 mt-2 py-3.5"
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in…</>
              : <><LogIn className="h-5 w-5" /> Sign In</>}
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 mt-6">Econcierge · Staff access only</p>
    </div>
  );
}
