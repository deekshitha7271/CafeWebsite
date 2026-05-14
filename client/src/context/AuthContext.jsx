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
        const isPaymentAuthError = error.config?.url?.includes('/payment/razorpay');
        if (error.response && error.response.status === 401 && !isPaymentAuthError) {
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    const fetchMe = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const url = `${baseUrl}/api/auth/me`.replace(/\/api\/api/, '/api');
        console.log('🔌 Calling API at:', url);
        const response = await axios.get(url);
        setUser(response.data.user || null);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Staff login: email + password
  const login = async (email, password) => {
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const url = `${baseUrl}/api/auth/login`.replace(/\/api\/api/, '/api');
      console.log('🔐 Attempting login at:', url);
      const response = await axios.post(url, { email, password });
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Login failed';
      throw new Error(message);
    }
  };



  const logout = async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/auth/logout`.replace(/\/api\/api/, '/api');
      await axios.post(url);
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, loading, error, login, logout }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
