# CampaignOS

AI-powered social media campaign management for PTO organizations.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (auth & database)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Add your Supabase project URL and anon key from [supabase.com/dashboard](https://supabase.com/dashboard).

### 3. Create the database table

In the Supabase dashboard, open **SQL Editor** and run the migration in `supabase/migrations/001_create_events_table.sql`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/     # Dashboard overview
│   │   ├── events/        # Events list
│   │   │   └── create/    # Create event form
│   │   └── settings/      # Organization settings
│   ├── layout.tsx
│   └── page.tsx           # Redirects to /dashboard
├── components/
│   ├── events/            # Event cards, forms, lists
│   ├── layout/            # Sidebar, shell
│   └── ui/                # Reusable UI primitives
├── lib/
│   ├── events/            # Queries, actions, validation
│   ├── supabase/          # Browser, server, middleware clients
│   └── utils/             # Shared utilities
└── types/                 # Shared TypeScript types
```

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |
