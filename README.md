# Protea Team App — Setup Guide

## 1. Run the Supabase schema

1. Go to your Supabase project → **SQL Editor**
2. Open `supabase-schema.sql` from this folder
3. Paste the entire contents and click **Run**
4. This creates all tables, policies and storage

## 2. Create user accounts

For each of your 14 team members:

1. Go to Supabase → **Authentication → Users → Invite user**
2. Enter their email — they'll get a link to set their password
3. After they confirm, go to **Table Editor → profiles** and add a row:
   - `id` — copy from the auth.users table (same UUID)
   - `name` — full name e.g. "Jamie Smith"
   - `initials` — e.g. "JS"
   - `role` — `angler`, `coach`, or `manager`
   - `team` — `U19`, `U24`, or `management`

## 3. Install and run locally

```bash
cd protea-app
npm install
npm start
```

App runs at http://localhost:3000

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Deploy — Vercel auto-detects Create React App
4. Share the Vercel URL with your team

That's it. Everyone opens the URL on their phone, logs in, done.

## 5. Seed the flybox (before practice)

Manager/captain uploads initial flies via the Flybox tab.
Each fly needs: name, size, sector, photo (optional but recommended).

---

## Phase 2 (post-MVP)
- Google Maps satellite layer with catch pin drops
- Sector trend views across sessions
- Coach plan evolution history
