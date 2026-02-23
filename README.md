# Kanban Board

A real-time Kanban board built with **Next.js 14** (App Router), **Supabase**, **Tailwind CSS**, and **@hello-pangea/dnd**. Tasks stay in sync across tabs and devices via Supabase Realtime.

## Features

- Three columns: **To Do**, **In Progress**, **Done**
- Drag and drop cards between columns (updates status in the database)
- Add tasks with an inline form at the top of each column
- Delete tasks with one click
- Real-time updates when tasks are created, updated, or deleted (no refresh needed)
- Responsive layout and loading skeleton
- Server actions for all mutations; Row Level Security and Realtime on Supabase

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres, Realtime, server-side client via `@supabase/ssr`)
- **Tailwind CSS**
- **@hello-pangea/dnd** (drag and drop)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone https://github.com/Anish478/kanban-board.git
cd kanban-board
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the migration:
   - Open `supabase/migrations/20250222000000_create_tasks.sql`
   - Copy its contents into a new query and run it.  
   This creates the `tasks` table, RLS policies, and enables Realtime.
3. In **Project Settings → API**, copy:
   - **Project URL**
   - **anon public** key

### 3. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace with your actual URL and anon key from the Supabase API settings.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can add tasks, drag them between columns, and delete them. Open another tab or window to see real-time updates.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Build for production     |
| `npm start`    | Run production build    |
| `npm run lint` | Run ESLint              |

## Project structure

- `app/` – Next.js App Router (layout, page, styles)
- `actions/` – Server actions (`getTasks`, `createTask`, `updateTaskStatus`, `updateTaskOrder`, `deleteTask`)
- `lib/` – Supabase client (browser + server), shared types
- `supabase/migrations/` – SQL schema and Realtime setup

## Security

This app uses **Next.js 14.2.35**, which includes the December 2025 security patches for React Server Components.  
`npm audit` may still report one high-severity advisory (Image Optimizer DoS). That issue only affects apps using `next/image` with `remotePatterns`; this app does not use that feature. To clear the audit entirely you can run `npm audit fix --force` (upgrades to Next 16 — test the app afterward).

## License

MIT
