# Bloc

A visual-first social app for Nigerian campus and creative culture — photos, Stories, and DMs. Built lean for v1, launching at FUT Minna, open to anyone.

## Structure

```
bloc/
├── mobile/     → React Native (Expo) app
├── backend/    → Node.js + Express API
└── README.md
```

## Stack

- **Mobile**: React Native (Expo)
- **Backend**: Node.js + Express
- **Database + Auth + Realtime**: Supabase (Postgres)
- **Media storage**: Cloudinary
- **Push notifications**: Expo Notifications
- **Hosting**: Railway or Render

## Getting Started

### 1. Supabase setup (do this first — both mobile and backend depend on it)

1. Create a free project at [supabase.com](https://supabase.com)
2. Grab your Project URL and anon/public API key from Settings → API
3. Run the SQL in `backend/src/config/schema.sql` in the Supabase SQL editor to create the v1 tables
4. Enable Realtime on the `messages` table (Database → Replication)
5. In Authentication → Providers, confirm Email is enabled (it is by default) — this is what powers signup/login
6. In Authentication → Settings, you can disable "Confirm email" while testing locally so new accounts work immediately without checking inbox

### 2. Cloudinary setup

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Grab your Cloud Name, API Key, and API Secret from the dashboard

### 3. Backend

```bash
cd backend
cp .env.example .env   # fill in your Supabase + Cloudinary keys
npm install
npm run dev
```

### 4. Mobile

```bash
cd mobile
cp .env.example .env   # fill in your Supabase URL + anon key, and backend API URL
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone to run it live.

## Team

| Role | Owns | Name |
|---|---|---|
| Product / Brand | Scope, design, launch | Laren |
| Mobile (frontend) | React Native app | TBD |
| Backend | API, database, auth | TBD |

## V1 Scope (built so far)

- ✅ Theme system — light / dark / system-match, off-white default, burnt orange accent
- ✅ Auth — signup, login, session persistence, profile setup, branded brick-fall loading animation
- ✅ Posting — photo upload (Cloudinary) → feed (chronological)
- ✅ Likes + comments — real-time counts, optimistic like toggling
- ✅ Stories — 24hr expiry, multi-story per user, location/event tagging, chained viewer (auto-advances into next person's stories), pause-on-hold
- ✅ Profile — grid of posts, follower/following counts, follow/unfollow with optimistic UI
- ⚠️ Direct messages — inbox, chat screen, and send/receive are built ahead of the V1 roadmap (which deferred DMs to V2+). Currently polls on screen focus rather than updating live — Realtime is enabled on the `messages` table per setup step 1.4 above, but the chat/inbox screens don't yet subscribe to it, so a message won't appear for the recipient until they leave and reopen the chat
- ⏳ Explore/discover — not yet built
- ⏳ Avatar upload during profile setup — UI lets you pick a photo, but it isn't uploaded or saved yet (deferred alongside post-image upload work); the picker should probably be hidden until this is wired up

See `Bloc_Roadmap.pdf` (shared earlier) for the full phase-by-phase plan.

## Pushing this to GitHub

This folder is already a git repo (`git init` + first commit done). To push it to your own GitHub:

1. Create a new empty repo on GitHub (don't initialize it with a README/.gitignore — this folder already has both)
2. In this folder, run:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

3. If prompted for credentials, use a [Personal Access Token](https://github.com/settings/tokens) instead of your password (GitHub no longer accepts password auth over HTTPS)

Your `.env` files are already excluded via `.gitignore` — only `.env.example` gets pushed. Never commit real Supabase/Cloudinary keys.
