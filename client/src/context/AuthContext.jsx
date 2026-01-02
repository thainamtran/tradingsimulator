import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { googleLogout } from '@react-oauth/google';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Mock login for dev
  const mockLogin = async (email) => {
    try {
      const res = await axios.post('http://localhost:3001/api/auth/mock-login', { email });
      setUser(res.data);
      localStorage.setItem('user_email', email); 
    } catch (error) {
      console.error('Mock login failed', error);
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    const { credential } = credentialResponse;
    setToken(credential);
    localStorage.setItem('token', credential);
    await fetchUser(credential);
  };

  const fetchUser = async (authToken = token) => {
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const mockEmail = localStorage.getItem('user_email');
      if (!authToken && mockEmail) {
         headers['X-User-Email'] = mockEmail;
      }
      
      if (Object.keys(headers).length === 0) {
          setLoading(false);
          return;
      }

      const res = await axios.get('http://localhost:3001/api/user', { headers });
      setUser(res.data);
    } catch (error) {
      console.error('Fetch user failed', error);
      // Don't logout on simple fetch failure (could be network), only if 401? 
      // For now keep it simple, maybe don't logout automatically in refresh
      if (error.response && error.response.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    googleLogout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
  };

  useEffect(() => {
    fetchUser(token);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, mockLogin, loading, refreshUser: () => fetchUser() }}>
      {children}
    </AuthContext.Provider>
  );
};
