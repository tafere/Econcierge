import { useState } from "react";
import { useLocation } from "wouter";
import { ConciergeBell, Building2, User, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ hotelName: "", fullName: "", username: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState<{ hotelName: string; username: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/setup/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelName: form.hotelName,
        fullName:  form.fullName,
        username:  form.username,
        password:  form.password,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setDone(d);
    } else {
      setError(d.error || "Registration failed");
    }
    setLoading(false);
  };

  const inputCls = `w-full h-12 bg-white border border-slate-200 rounded pl-10 pr-4 text-sm text-slate-900
    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors`;

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded p-8 text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Hotel Registered!</h2>
        <p className="text-slate-500 text-sm">
          <span className="font-bold text-slate-800">{done.hotelName}</span> is set up.<br />
          Sign in with username <span className="font-mono font-bold text-brand-700">@{done.username}</span> to get started.
        </p>
        <button
          onClick={() => navigate("/")}
          className="w-full h-11 bg-brand-700 hover:bg-brand-800 text-white rounded font-bold text-sm transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-brand-600 rounded mb-5 shadow-lg shadow-brand-200">
          <ConciergeBell className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 leading-tight">Register Your Hotel</h1>
        <p className="text-slate-400 text-sm mt-2">Create your admin account to get started</p>
      </div>

      <div className="w-full max-w-md glass rounded overflow-hidden">

        <div className="px-8 pt-7 pb-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Hotel Setup</h2>
          <p className="text-slate-400 text-sm mt-0.5">You'll be the admin — add staff after sign-in</p>
        </div>

        <form onSubmit={submit} className="px-8 py-6 space-y-4">

          {/* Hotel Name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Hotel Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))}
                required placeholder="e.g. Grand Hilton Hotel" className={inputCls} />
            </div>
          </div>

          {/* Your Name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                required placeholder="e.g. Abebe Kebede" className={inputCls} />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required placeholder="e.g. abebe" className={inputCls} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type={showPwd ? "text" : "password"}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6} placeholder="Min. 6 characters"
                className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="password"
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required placeholder="Re-enter password" className={inputCls} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-sm
              flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-brand-200 mt-1">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating…</> : "Register Hotel"}
          </button>
        </form>
      </div>

      <button onClick={() => navigate("/")}
        className="mt-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </button>
    </div>
  );
}
