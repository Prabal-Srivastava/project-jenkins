import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiJson } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has active session
    apiJson("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async ({ email, password }) => {
    await apiJson("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    const me = await apiJson("/api/auth/me");
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    await apiJson("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    const me = await apiJson("/api/auth/me");
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try { await apiJson("/api/auth/logout", { method: "POST" }); } catch (_) {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
