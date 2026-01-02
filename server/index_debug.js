require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb, getDb } = require('./db');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

app.use(cors());
app.use(express.json());

// Initialize DB
initDb().catch(console.error);

// Auth Middleware
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  // Dev backdoor for mock login
  if (req.headers['x-user-email']) {
      const db = getDb();
      const user = await db.get('SELECT * FROM users WHERE email = ?', req.headers['x-user-email']);
      if (user) {
        req.user = user;
        return next();
      }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // Upsert user
    const db = getDb();
    let user = await db.get('SELECT * FROM users WHERE google_id = ?', payload.sub);
    if (!user) {
      const result = await db.run(
        'INSERT INTO users (google_id, email, name, balance) VALUES (?, ?, ?, ?)',
        payload.sub, payload.email, payload.name, 10000
      );
      user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
    }
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Get User Info
app.get('/api/user', verifyToken, async (req, res) => {
  res.json(req.user);
});

// Get Stock Price
app.get('/api/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  console.log(`Fetching quote for ${symbol}`);
  try {
    const quote = await yahooFinance.quote(symbol);
    console.log('Quote received:', quote);
    res.json({ symbol: quote.symbol, price: quote.regularMarketPrice, name: quote.longName });
  } catch (error) {
    console.error('Yahoo Finance Error:', error);
    res.status(404).json({ error: 'Stock not found' });
  }
});

// Buy Stock
app.post('/api/trade/buy', verifyToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid request' });

  const db = getDb();
  
  try {
    // Get current price
    const quote = await yahooFinance.quote(symbol);
    const price = quote.regularMarketPrice;
    const cost = price * quantity;

    // Check balance
    if (req.user.balance < cost) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Transaction
    await db.run('BEGIN TRANSACTION');

    // Update Balance
    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', cost, req.user.id);

    // Record Transaction
    await db.run(
      'INSERT INTO transactions (user_id, symbol, type, quantity, price) VALUES (?, ?, ?, ?, ?)',
      req.user.id, symbol, 'BUY', quantity, price
    );

    // Update Portfolio
    const portfolioItem = await db.get('SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?', req.user.id, symbol);
    if (portfolioItem) {
      const newQuantity = portfolioItem.quantity + quantity;
      // Weighted average price
      const totalCost = (portfolioItem.average_price * portfolioItem.quantity) + cost;
      const newAvgPrice = totalCost / newQuantity;
      await db.run(
        'UPDATE portfolio SET quantity = ?, average_price = ? WHERE user_id = ? AND symbol = ?',
        newQuantity, newAvgPrice, req.user.id, symbol
      );
    } else {
      await db.run(
        'INSERT INTO portfolio (user_id, symbol, quantity, average_price) VALUES (?, ?, ?, ?)',
        req.user.id, symbol, quantity, price
      );
    }

    await db.run('COMMIT');
    
    // Return updated user and portfolio?
    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    res.json({ message: 'Buy successful', user: updatedUser, price });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Trade failed' });
  }
});

// Sell Stock
app.post('/api/trade/sell', verifyToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid request' });

  const db = getDb();

  try {
    const portfolioItem = await db.get('SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?', req.user.id, symbol);
    if (!portfolioItem || portfolioItem.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock quantity' });
    }

    // Get current price
    const quote = await yahooFinance.quote(symbol);
    const price = quote.regularMarketPrice;
    const revenue = price * quantity;

    await db.run('BEGIN TRANSACTION');

    // Update Balance
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', revenue, req.user.id);

    // Record Transaction
    await db.run(
      'INSERT INTO transactions (user_id, symbol, type, quantity, price) VALUES (?, ?, ?, ?, ?)',
      req.user.id, symbol, 'SELL', quantity, price
    );

    // Update Portfolio
    const newQuantity = portfolioItem.quantity - quantity;
    if (newQuantity === 0) {
      await db.run('DELETE FROM portfolio WHERE user_id = ? AND symbol = ?', req.user.id, symbol);
    } else {
      await db.run(
        'UPDATE portfolio SET quantity = ? WHERE user_id = ? AND symbol = ?',
        newQuantity, req.user.id, symbol
      );
    }

    await db.run('COMMIT');

    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    res.json({ message: 'Sell successful', user: updatedUser, price });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Trade failed' });
  }
});

// Get Portfolio
app.get('/api/portfolio', verifyToken, async (req, res) => {
  const db = getDb();
  const portfolio = await db.all('SELECT * FROM portfolio WHERE user_id = ?', req.user.id);
  
  // Enrich with current prices
  const enriched = await Promise.all(portfolio.map(async (item) => {
    try {
      const quote = await yahooFinance.quote(item.symbol);
      return {
        ...item,
        current_price: quote.regularMarketPrice,
        profit_loss: (quote.regularMarketPrice - item.average_price) * item.quantity,
        percent_gain: ((quote.regularMarketPrice - item.average_price) / item.average_price) * 100
      };
    } catch (e) {
      return { ...item, current_price: null, profit_loss: null, percent_gain: null };
    }
  }));

  res.json(enriched);
});

// Mock Login
app.post('/api/auth/mock-login', async (req, res) => {
    const { email, name } = req.body;
    const db = getDb();
    let user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
        // Create dummy google_id
        const google_id = 'mock_' + Date.now();
        const result = await db.run(
            'INSERT INTO users (google_id, email, name, balance) VALUES (?, ?, ?, ?)',
            google_id, email, name || 'Mock User', 10000
        );
        user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
    }
    res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setInterval(() => {}, 10000); // Keep process alive
});
