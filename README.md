# Meal Planner

A personal meal, nutrition & fitness planner — recipes, weekly planning, shopping lists,
food/exercise logging, and progress tracking, all connected. Built with React + Vite +
Supabase, deployed for free on Netlify.

## Local development

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + anon key
npm run dev
```

## One-time setup (do this before first use)

See [SETUP.md](./SETUP.md) for step-by-step instructions to:

1. Create a free Supabase project and load the database schema
2. Push this repo to GitHub
3. Connect it to Netlify for free hosting with auto-deploy on every push

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth) — see [db/schema.sql](./db/schema.sql)
- TanStack Query for data fetching
- React Router
- Installable as a PWA (add to your phone's home screen)
