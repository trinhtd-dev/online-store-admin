import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { UserResponse, LoginResponse } from "../api/types";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserInfo: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const storedUserStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUserStr && token) {
        try {
          // First try to parse stored user
          const storedUser = JSON.parse(storedUserStr);

          // Verify token is valid by calling the /auth/me endpoint
          // Our axiosClient automatically returns response.data
          const userData = (await axiosClient.get("/auth/me")) as UserResponse;

          // Backend /me endpoint returns: { id, email, full_name, role }
          const user: User = {
            id: userData.id,
            name: userData.full_name, // Server returns full_name in /me endpoint
            email: userData.email,
            role: userData.role || "user",
          };

          setUser(user);
          setIsAuthenticated(true);

          // Update stored user data if needed
          localStorage.setItem("user", JSON.stringify(user));
        } catch (error) {
          console.error("Auth verification failed:", error);
          // Token is invalid or expired
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const updateUserInfo = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Login endpoint returns: { id, name, email, role, token, refreshToken }
      // Our axiosClient automatically returns response.data
      const userData = (await axiosClient.post("/auth/login", {
        email,
        password,
      })) as LoginResponse;

      // Store auth data
      localStorage.setItem("token", userData.token);
      localStorage.setItem("refreshToken", userData.refreshToken);

      const user: User = {
        id: userData.id,
        name: userData.name, // Login endpoint returns 'name' (which is full_name from DB)
        email: userData.email,
        role: userData.role || "user",
      };

      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);

      navigate("/");
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
      navigate("/login");
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
