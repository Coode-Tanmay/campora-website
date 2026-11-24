import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  loginCustomer: (data: { email: string; password?: string; name?: string; whatsapp?: string; college?: string; referralCode?: string }) => Promise<{ success: boolean; user?: AuthUser; verificationRequired?: boolean; error?: string }>;
  loginAdmin: (username: string, password: string) => Promise<{ success: boolean; user: AuthUser }>;
  oauthLogin: (data: { provider: 'google' | 'microsoft'; email: string; name?: string; college?: string; whatsapp?: string; avatar?: string }) => Promise<{ success: boolean; user: AuthUser }>;
  setUserDirectly: (user: AuthUser, token?: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    try {
      const res = await api.checkSession();
      if (res.authenticated && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const loginCustomer = async (data: { email: string; password?: string; name?: string; whatsapp?: string; college?: string; referralCode?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.customerLogin(data);
      if (res.user) setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.adminLogin(username, password);
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const oauthLogin = async (data: { provider: 'google' | 'microsoft'; email: string; name?: string; college?: string; whatsapp?: string; avatar?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.customerOAuth(data);
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const setUserDirectly = (authUser: AuthUser, token?: string) => {
    // The server sets the HttpOnly session cookie; never persist session tokens in localStorage.
    setUser(authUser);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isCustomer,
        isLoading,
        loginCustomer,
        loginAdmin,
        oauthLogin,
        setUserDirectly,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
