import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../lib/api';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  username?: string;
  is2FAEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean; sessionToken?: string } | void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    role?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  verify2FA: (sessionToken: string, code: string) => Promise<void>;
  send2FACode: (sessionToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await api.getProfile();
          setUser(userData);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      
      // Check if 2FA is required
      if (result.requires2FA && result.sessionToken) {
        return { requires2FA: true, sessionToken: result.sessionToken };
      }

      // Normal login
      if (result.user) {
        setUser(result.user);
        return;
      }

      throw new Error('Invalid login response');
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }, []);

  const verify2FA = useCallback(async (sessionToken: string, code: string) => {
    try {
      const { user: userData } = await api.verify2FA(sessionToken, code);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || '2FA verification failed');
    }
  }, []);

  const send2FACode = useCallback(async (sessionToken: string) => {
    try {
      await api.send2FACode(sessionToken);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send 2FA code');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    role?: string;
  }) => {
    // Registration is disabled. Only admins may create accounts via the Admin panel.
    throw new Error('Registration is disabled. Please contact an administrator to create an account.');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getProfile();
      setUser(userData);
    } catch (error) {
      // If refresh fails, user might be logged out
      setUser(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    refreshUser,
    verify2FA,
    send2FACode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
