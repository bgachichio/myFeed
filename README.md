# myFeed

A clean, fast, personal RSS reader built with React, Vite, Tailwind CSS, and Supabase.

Live at: [myfeed.gachichio.org](https://myfeed.gachichio.org)

## Features

- **RSS & Atom feed aggregation** — Add any RSS/Atom feed source
- **Full-text article fetching** — Reads full articles inline where the feed supports it
- **Unread / Read / All filter** — Clean reading queue by default
- **Multi-select bulk actions** — Mark multiple articles read or unread at once
- **Bookmarks & Read Later** — Save articles for later
- **Daily Digest** — Summarised view of today's articles
- **Sources management** — Feed health monitoring, OPML import/export
- **Stats dashboard** — Reading activity over time
- **Full-text search** — Search across all your articles
- **Dark mode** — System-aware, toggle in sidebar
- **Keyboard shortcuts** — Power user navigation
- **Settings** — Font, date format, timezone, reading preferences
- **Mobile responsive** — Works on all screen sizes

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Lucide icons
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **Hosting:** Firebase Hosting (Google Cloud)
- **Fonts:** Google Fonts (Inter, Lato, Merriweather)

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/myfeed.git
cd myfeed
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key in `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up the database

Run the SQL migration files in order in your Supabase SQL Editor:

```
supabase_migration.sql
supabase_migration_v2.sql
supabase_migration_v3.sql
supabase_migration_v4.sql
supabase_migration_v5.sql
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deployment

This project is deployed via Firebase Hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |

These are safe to expose in the browser (Supabase anon keys are designed for client-side use). Never commit your `.env` file.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth, Theme, Settings, Unread)
├── lib/              # Utilities (RSS parser, Supabase client, date format)
├── pages/            # Page-level components (FeedView, SettingsView, etc.)
└── main.jsx          # App entry point
```

---

Built with ❤️ by [Brian Gachichio](https://gachichio.substack.com)
