# Hey Ralli

AI communications OS for school PTO / PTA volunteers — calendar → campaigns → approve → publish to Meta.

**Production:** [heyralli.com](https://heyralli.com)  
**Docs hub:** **[docs/README.md](docs/README.md)** ← start here

Codebase / Vercel project may still say CampaignOS.

## Stack

Next.js 15 · React 19 · TypeScript · Supabase · Tailwind CSS 4 · Vercel · OpenAI · Meta Graph API

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill Supabase (and other keys as needed)
npm run dev                        # http://localhost:3000
```

Full setup notes: [docs/getting-started/local-setup.md](docs/getting-started/local-setup.md)  
Env catalog: [.env.local.example](.env.local.example)

## Where to go next

| Need | Doc |
|------|-----|
| Documentation index | [docs/README.md](docs/README.md) |
| What shipped | [docs/FEATURE_LIST.md](docs/FEATURE_LIST.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| QA orientation | [docs/QA_ARCHITECTURE_OVERVIEW.md](docs/QA_ARCHITECTURE_OVERVIEW.md) |
| Agent rules (Cursor) | [AGENTS.md](AGENTS.md) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:hey-ralli` | Playwright smokes |
