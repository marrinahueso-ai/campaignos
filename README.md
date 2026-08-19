# Hey Ralli

AI communications OS for school PTO / PTA volunteers — calendar → campaigns → approve → publish to Meta.

**Production:** [heyralli.com](https://heyralli.com)  
**Docs hub:** **[docs/README.md](docs/README.md)** ← start here  
**Contractors:** **[docs/engineering/contractor-onboarding.md](docs/engineering/contractor-onboarding.md)** (staging only — never copy a production `.env.local`)

Codebase / Vercel project may still say CampaignOS.

## Stack

Next.js 15 · React 19 · TypeScript · Supabase · Tailwind CSS 4 · Vercel · OpenAI · Meta Graph API

## Quick start

Requires **Node 20** (see `.nvmrc`).

```bash
npm install
cp .env.contractor.example .env.local   # staging keys from 1Password — not production
npm run dev                             # http://localhost:3000
```

Full catalog of env **names**: [.env.local.example](.env.local.example)  
Setup notes: [docs/getting-started/local-setup.md](docs/getting-started/local-setup.md)

## Where to go next

| Need | Doc |
|------|-----|
| Documentation index | [docs/README.md](docs/README.md) |
| Contractor onboarding | [docs/engineering/contractor-onboarding.md](docs/engineering/contractor-onboarding.md) |
| What shipped | [docs/product/feature-list.md](docs/product/feature-list.md) |
| Architecture | [docs/engineering/architecture.md](docs/engineering/architecture.md) |
| QA orientation | [docs/qa/architecture-overview.md](docs/qa/architecture-overview.md) |
| Agent rules (Cursor) | [AGENTS.md](AGENTS.md) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:hey-ralli` | Playwright smokes |
