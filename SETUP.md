# Setup guide

Three things to do once: create your database, push the code to GitHub, and connect
Netlify. Takes about 10 minutes.

## 1. Create your Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New project**. Pick any name and a database password (save it somewhere), and
   choose a region close to you. Free tier is enough for personal use.
3. Once the project is ready, open **SQL Editor** in the left sidebar → **New query**.
4. Open [db/schema.sql](./db/schema.sql) from this repo, copy its entire contents, paste
   into the SQL editor, and click **Run**. This creates all the tables and locks every
   row down so only you can see your own data.
5. Go to **Settings → API**. Copy the **Project URL** and the **anon public** key.
6. In this project folder, copy `.env.example` to `.env` and paste those two values in:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
7. Run `npm run dev`, open the app, and create your account on the login screen (just an
   email + password — it's only ever used by you). Supabase will send a confirmation
   email; click the link, then sign in.

## 2. Push to GitHub

If you don't already have a GitHub repo for this:

1. Go to [github.com/new](https://github.com/new), create a new **private** repo (no
   README/gitignore — this folder already has them), and copy its URL.
2. Tell me the repo URL and I'll push this code to it. Or run it yourself:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

## 3. Connect Netlify (free hosting + auto-deploy)

1. Go to [app.netlify.com](https://app.netlify.com) and sign up / log in (you can use
   your GitHub account to sign in).
2. **Add new site → Import an existing project → GitHub**, and pick this repo.
3. Netlify should auto-detect the build settings from `netlify.toml` (build command
   `npm run build`, publish directory `dist`) — leave them as-is.
4. Before deploying, open **Site settings → Environment variables** and add the same two
   values from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy site**. From now on, every push to `main` auto-deploys.
6. Once it's live, open the Netlify URL on your phone and use "Add to Home Screen" (it's
   a PWA, so it installs like an app).

That's it — everything after this is just using the app normally.
