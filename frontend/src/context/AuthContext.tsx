import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../api/client";

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
  industry: string;
}

interface AuthResult {
  user: User;
  tenantSlug: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function login(email: string, password: string): Promise<AuthResult> {
    const response = await api.post("/auth/login", { email, password });
    const tenantSlug: string | null = response.data.data.tenantSlug ?? null;
    const loggedInUser = await fetchCurrentUser();
    return { user: loggedInUser, tenantSlug };
  }

  async function register(input: RegisterInput): Promise<AuthResult> {
    const response = await api.post("/auth/register", input);
    const tenantSlug: string | null = response.data.data.tenantSlug ?? null;
    const loggedInUser = await fetchCurrentUser();
    return { user: loggedInUser, tenantSlug };
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }

  async function fetchCurrentUser(): Promise<User> {
    const response = await api.get("/users/me");
    setUser(response.data.data);
    return response.data.data as User;
  }

  useEffect(() => {
    // Auth now lives in an httpOnly cookie, so — unlike the old in-memory
    // tokens — a session survives a page refresh. Try to restore it once
    // on mount; a 401 here just means "not logged in", not an error.
    fetchCurrentUser()
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
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
