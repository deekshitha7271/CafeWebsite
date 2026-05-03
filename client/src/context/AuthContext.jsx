import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.defaults.withCredentials = true;

    // Global Axios Interceptor to catch 401 Unauthorized and log out
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    const fetchMe = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`);
        setUser(response.data.user || null);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { email, password });
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Login failed';
      throw new Error(message);
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, { name, email, password });
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Registration failed';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`);
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, loading, error, login, register, logout }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
