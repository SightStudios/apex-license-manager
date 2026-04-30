import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ADMIN_USERNAME = "corruptedwin";
const ADMIN_PASSWORD = "F16k12i01k89#16";
const SESSION_KEY = "apex.session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

interface Session {
  username: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

interface AuthContextValue {
  session: Session | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const onStorage = () => setSession(readSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = async (username: string, password: string) => {
    await new Promise((r) => setTimeout(r, 350)); // mock latency
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return { ok: false, error: "Invalid credentials" };
    }
    const now = Date.now();
    const s: Session = {
      username,
      token: randomToken(),
      issuedAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
