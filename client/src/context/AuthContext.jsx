import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('token');
    return t && t !== 'undefined' && t !== 'null' ? t : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' && u !== 'null' ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Load the current user on mount (if a token exists)
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        const userData = data.user || data.data || data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        console.error('Session check failed:', err?.response?.data?.message || err.message);
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const t = data.token || data.data?.token;
    const u = data.user || data.data?.user || (data.data?.name ? data.data : data);
    console.log('Logged-in user:', u);
    console.log('User role:', u?.role);
    if (!t) {
      throw new Error('Authentication response did not contain a valid token');
    }

    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name, email, password, phone, address) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone, address });
    const t = data.token || data.data?.token;
    const u = data.user || data.data?.user || (data.data?.name ? data.data : data);

    if (!t) {
      throw new Error('Authentication response did not contain a valid token');
    }

    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
