import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('jamat_token');
    const savedUser = localStorage.getItem('jamat_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.success) {
      localStorage.setItem('jamat_token', data.token);
      localStorage.setItem('jamat_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    if (data.success) {
      localStorage.setItem('jamat_token', data.token);
      localStorage.setItem('jamat_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('jamat_token');
    localStorage.removeItem('jamat_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant' || isAdmin;
  const isRoutePlanner = user?.role === 'route_planner' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isAccountant, isRoutePlanner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
