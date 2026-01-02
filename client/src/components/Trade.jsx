import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Trade = () => {
  const [symbol, setSymbol] = useState('');
  const [quote, setQuote] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const getAuthHeaders = () => {
      const token = localStorage.getItem('token');
      const mockEmail = localStorage.getItem('user_email');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (mockEmail) headers['X-User-Email'] = mockEmail;
      return headers;
  }

  const handleSearch = async (e) => {
      e.preventDefault();
      setError('');
      setQuote(null);
      if (!symbol) return;
      try {
          const res = await axios.get(`http://localhost:3001/api/stock/${symbol}`);
          setQuote(res.data);
      } catch (err) {
          setError('Stock not found');
      }
  };

  const handleTrade = async (type) => {
      setError('');
      setMsg('');
      try {
          await axios.post(`http://localhost:3001/api/trade/${type}`, {
              symbol: quote.symbol,
              quantity: parseInt(quantity)
          }, { headers: getAuthHeaders() });
          setMsg(`${type.toUpperCase()} Successful!`);
          setTimeout(() => navigate('/dashboard'), 1500);
      } catch (err) {
          setError(err.response?.data?.error || 'Trade failed');
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md h-fit">
             <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">Trade Stock</h2>
                <button onClick={() => navigate('/dashboard')} className="text-blue-500">Cancel</button>
             </div>
             
             <form onSubmit={handleSearch} className="mb-6 flex gap-2">
                 <input 
                    type="text" 
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Symbol (e.g. AAPL)"
                    className="border p-2 rounded flex-1"
                 />
                 <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded">Search</button>
             </form>

             {error && <p className="text-red-500 mb-4">{error}</p>}
             {msg && <p className="text-green-500 mb-4">{msg}</p>}

             {quote && (
                 <div className="border p-4 rounded bg-gray-50">
                     <h3 className="font-bold text-lg">{quote.name} ({quote.symbol})</h3>
                     <p className="text-2xl font-bold mb-4">${quote.price.toFixed(2)}</p>
                     
                     <div className="flex items-center gap-4 mb-4">
                         <label>Quantity:</label>
                         <input 
                            type="number" 
                            min="1" 
                            value={quantity} 
                            onChange={(e) => setQuantity(e.target.value)}
                            className="border p-2 rounded w-20"
                         />
                     </div>
                     
                     <p className="mb-4 text-sm text-gray-600">Total: ${(quote.price * quantity).toFixed(2)}</p>

                     <div className="flex gap-4">
                         <button 
                            onClick={() => handleTrade('buy')}
                            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                         >
                             Buy
                         </button>
                         <button 
                            onClick={() => handleTrade('sell')}
                            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
                         >
                             Sell
                         </button>
                     </div>
                 </div>
             )}
        </div>
    </div>
  );
};

export default Trade;
