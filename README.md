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

### Troubleshooting

| Symptom | Fix |
| -------- | ----- |
| Browser **connection refused** on localhost | Start the dev server: `npm run dev` (listens on port **3000**). |
| **500** errors or `Cannot find module` under `.next` | Clear the Next cache and restart: `npm run dev:clean`. |
| **Monday Connect** fails locally | Add `MONDAY_CLIENT_ID` and `MONDAY_CLIENT_SECRET` to `.env.local` (copy from Vercel Production or Monday Developer Center). Register `http://localhost:3000/api/monday/oauth/callback` in Monday Developer Center → OAuth. Do not set `NEXT_PUBLIC_SITE_URL` to your Vercel URL when testing OAuth on localhost. If secrets exist only on Vercel, test Monday on the deployed site instead. |
| **Supabase auth** redirect errors | In Supabase → Authentication → URL configuration, add `http://localhost:3000/auth/callback` to redirect URLs. |

Optional for easier local signup: `CAMPAIGNOS_REQUIRE_ACCESS_CODE=false` in `.env.local`.


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
