# Hosting Guide (Free Options)

## Option 1: Replit / Glitch (Best for SQLite)
Since your app uses **SQLite** (a local file database), typical cloud hosts like Render/Vercel/Heroku will **wipe your data** every time the server restarts (ephemeral file system). 

**Replit** or **Glitch** are good free options that keep your files persistent.

1.  Create a new Repl (Import from GitHub or upload files).
2.  Run `npm install` in both `client` and `server`.
3.  Use the `server` as the entry point.
4.  Replit handles the file storage automatically.

## Option 2: Render.com (Free Web Service)
This is a more "professional" hosting setup but requires a small workaround for SQLite or a migration to Postgres.

### If you stick with SQLite (Data resets on deploy):
1.  Push your code to **GitHub**.
2.  Create a new **Web Service** on [Render](https://render.com).
3.  Connect your GitHub repo.
4.  **Root Directory**: `server`
5.  **Build Command**: `npm run build` (This will install dependencies and build the client).
6.  **Start Command**: `npm start`.
7.  **Environment Variables**:
    - `NODE_VERSION`: `18` (or higher)
    - `GOOGLE_CLIENT_ID`: (Your Google Client ID)

*Note: Your user data will be reset if the server restarts.*

### If you want persistent data on Render:
You need to switch from SQLite to **PostgreSQL**.
1.  Create a free Postgres database on **Neon.tech** or **Supabase**.
2.  Get the `DATABASE_URL`.
3.  Update the code to use `pg` instead of `sqlite3` (I can help you with this migration if you ask!).
4.  Set `DATABASE_URL` in Render's environment variables.

## Verified Setup
I have configured your `server/index.js` to serve the React frontend automatically. This means you only need to deploy **one service** (the Node.js server), and it will handle both the API and the Website.
