# Cinematch — Setup Guide

## 1. Install Node.js

You'll need Node.js 20+. Choose one method:
- **Homebrew** (recommended): `brew install node`
- **MacPorts**: `sudo port install nodejs22`
- **Direct**: Download from https://nodejs.org

## 2. Set Up Supabase

1. Go to https://supabase.com and create a free account
2. Create a new project (pick any region)
3. Once the project is ready, go to **Settings → API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Go to the **SQL Editor** and paste the contents of `supabase/schema.sql`, then run it

## 3. Configure Environment

Edit `.env.local` and replace the Supabase placeholders:

```
NEXT_PUBLIC_TMDB_API_KEY=a6baea7bd9c4ac0c95de9358fa108f78  ← already set
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 4. Install & Run

```bash
cd /Users/joshgoodman/cinematch
npm install
npm run dev
```

Open http://localhost:3000

## 5. Enable Email Auth in Supabase

In your Supabase dashboard:
- Go to **Authentication → Providers**
- Make sure **Email** is enabled
- (Optional) Disable "Confirm email" under Auth settings for faster dev

## Features

| Page | What it does |
|------|-------------|
| `/` | Landing page |
| `/signup` `/login` | Auth |
| `/home` | Dashboard, Top 5, friends preview |
| `/rank` | Pairwise comparison (ELO ranking) |
| `/movies` | Full ranked list + add movies via TMDB search |
| `/friends` | Find friends, send/accept requests |
| `/friends/[id]` | View a friend's Top 5 and full list |
| `/recommendations` | Personalized picks based on your rankings |

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add the 3 env vars in the Vercel dashboard.
