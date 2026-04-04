import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface StaffUser {
  username: string;
  fullName: string;
  role: "ADMIN" | "STAFF";
  hotelId: number;
  hotelName: string;
  token: string;
}

interface AuthContextType {
  user: StaffUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = "econcierge_token";
const USER_KEY  = "econcierge_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const saved = localStorage.getItem(USER_KEY);
    if (token && saved) {
      try {
        setUser({ ...JSON.parse(saved), token });
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => { if (r.status === 401) { localStorage.clear(); setUser(null); } })
          .catch(() => {})
          .finally(() => setIsLoading(false));
      } catch {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Login failed");
    }
    const d = await res.json();
    const u: StaffUser = {
      username: d.username, fullName: d.fullName, role: d.role,
      hotelId: d.hotelId, hotelName: d.hotelName, token: d.token,
    };
    localStorage.setItem(TOKEN_KEY, d.token);
    localStorage.setItem(USER_KEY, JSON.stringify({ username: u.username, fullName: u.fullName, role: u.role, hotelId: u.hotelId, hotelName: u.hotelName }));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
