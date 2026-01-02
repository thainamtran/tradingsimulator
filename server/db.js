const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

async function initDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      balance REAL DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      symbol TEXT,
      type TEXT, -- 'BUY' or 'SELL'
      quantity INTEGER,
      price REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      user_id INTEGER,
      symbol TEXT,
      quantity INTEGER,
      average_price REAL,
      PRIMARY KEY (user_id, symbol),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  console.log('Database initialized');
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

module.exports = { initDb, getDb };
