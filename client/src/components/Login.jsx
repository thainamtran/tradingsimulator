import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { loginWithGoogle, mockLogin, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleMockLogin = async (e) => {
    e.preventDefault();
    await mockLogin(email);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Stock Sim Login</h1>
        
        <div className="mb-4 flex justify-center">
          <GoogleLogin
            onSuccess={loginWithGoogle}
            onError={() => console.log('Login Failed')}
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <h2 className="text-center text-sm text-gray-500 mb-2">Dev / Mock Login</h2>
          <form onSubmit={handleMockLogin}>
            <input
              type="email"
              placeholder="Enter email"
              className="w-full border p-2 rounded mb-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
              Login (Mock)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
