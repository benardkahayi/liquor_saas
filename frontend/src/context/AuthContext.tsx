import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, setTokens, clearTokens } from "../api/client";

interface User {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  role: { name: string } | null;
}

interface RegisterInput {
  businessName: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function login(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    const { accessToken, refreshToken } = response.data.data;
    setTokens(accessToken, refreshToken);
    return fetchCurrentUser();
  }

  async function register(input: RegisterInput) {
    const response = await api.post("/auth/register", input);
    const { accessToken, refreshToken } = response.data.data;
    setTokens(accessToken, refreshToken);
    return fetchCurrentUser();
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  async function fetchCurrentUser() {
    const response = await api.get("/users/me");
    setUser(response.data.data);
    return response.data.data as User;
  }

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
