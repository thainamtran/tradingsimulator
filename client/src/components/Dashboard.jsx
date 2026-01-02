import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [balance, setBalance] = useState(0);
  const [timeframe, setTimeframe] = useState('ALL'); // '1D', '1W', '1M', 'YTD', 'ALL'

  useEffect(() => {
    if (user) {
        setBalance(user.balance);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const mockEmail = localStorage.getItem('user_email');
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (mockEmail) headers['X-User-Email'] = mockEmail;

        try {
            const [portfolioRes, userRes] = await Promise.all([
                axios.get('/api/portfolio', { headers }),
                axios.get('/api/user', { headers })
            ]);
            setPortfolio(portfolioRes.data);
            setBalance(userRes.data.balance);
        } catch (e) {
            console.error(e);
        }
    };

    if (user) {
        fetchData(); // Initial fetch
        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval); // Cleanup
    }
  }, [user]);

  if (!user) return <div>Loading...</div>;

  const totalPortfolioValue = portfolio.reduce((acc, item) => {
      return acc + (item.current_price ? item.current_price * item.quantity : item.average_price * item.quantity); // Fallback to avg if current null
  }, 0);

  const totalBalance = balance + totalPortfolioValue;

  let displayPL = 0;
  let displayLabel = 'Total P/L';

  if (timeframe === '1D') {
      displayLabel = 'Day P/L';
      displayPL = portfolio.reduce((acc, item) => acc + (item.day_change ? item.day_change * item.quantity : 0), 0);
  } else {
      // For 1W, 1M, YTD, ALL, we default to ALL TIME logic for now as history is not tracked
      // In a real app, this would fetch historical snapshots
      displayLabel = timeframe === 'ALL' ? 'Total P/L' : `${timeframe} P/L`;
      displayPL = totalBalance - 10000; // Assuming 10k initial
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
                <span>Welcome, {user.name || user.email}</span>
                <button onClick={logout} className="text-red-500">Logout</button>
            </div>
        </div>

        <div className="flex space-x-2 mb-6">
            {['1D', '1W', '1M', 'YTD', 'ALL'].map(tf => (
                <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-4 py-2 rounded ${timeframe === tf ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                    {tf}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded shadow">
                <h3 className="text-gray-500">Cash Balance</h3>
                <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded shadow">
                <h3 className="text-gray-500">Portfolio Value</h3>
                <p className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded shadow">
                <h3 className="text-gray-500">{displayLabel}</h3>
                <p className={`text-2xl font-bold ${displayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${displayPL.toFixed(2)}
                </p>
            </div>
             <div className="bg-white p-6 rounded shadow">
                <h3 className="text-gray-500">Total Net Worth</h3>
                <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
            </div>
        </div>

        <div className="mb-8">
            <Link to="/trade" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                New Trade
            </Link>
        </div>

        <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {portfolio.map((item) => (
                        <tr key={item.symbol}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{item.symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap">${item.average_price.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {item.current_price ? `$${item.current_price.toFixed(2)}` : 'N/A'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${item.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profit_loss != null ? `$${item.profit_loss.toFixed(2)} (${item.percent_gain?.toFixed(2)}%)` : 'N/A'}
                            </td>
                        </tr>
                    ))}
                    {portfolio.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No stocks owned.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
