import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'TPA' | 'SALES_PERSON' | 'LAB_TECHNICIAN' | 'PHARMACIST' | 'FINANCE_MANAGER';
  hospitalId?: string;
  specialisation?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Create a default context value
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  user: null,
  login: () => {
    console.warn('AuthContext: login function called before provider was initialized');
  },
  logout: () => {
    console.warn('AuthContext: logout function called before provider was initialized');
  },
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error restoring auth state:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const login = (token: string, userData: User) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Failed to complete login process');
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      // Still set the state even if localStorage fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 