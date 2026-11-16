import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api
      .get("/api/users/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logout]);

  const finishLogin = (data) => {
    setToken(data.access_token);
    setUser(data.user);
  };

  const login = async (email, password) => finishLogin(await api.post("/api/auth/login", { email, password }));

  const register = async (name, email, password) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    finishLogin(await api.post("/api/auth/register", { name, email, password, timezone }));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
