import React, { createContext, useContext, useState } from 'react';
import type { User, TokenResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bw_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('bw_access_token');
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem('bw_refresh_token');
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data: TokenResponse = await api.login(email, password);
      const newUser: User = {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        avatar_initials: data.avatar_initials,
        is_active: true,
      };

      setUser(newUser);
      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token);

      localStorage.setItem('bw_access_token', data.access_token);
      localStorage.setItem('bw_refresh_token', data.refresh_token);
      localStorage.setItem('bw_user', JSON.stringify(newUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (refreshToken && accessToken) {
      await api.logout(refreshToken, accessToken);
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('bw_access_token');
    localStorage.removeItem('bw_refresh_token');
    localStorage.removeItem('bw_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
