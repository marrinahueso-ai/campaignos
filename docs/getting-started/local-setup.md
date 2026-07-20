# Local setup

**Status:** Planned stub  
**Owner:** TBD  
**Last updated:** July 20, 2026  
**Related:** [Getting started](./README.md) · [`.env.local.example`](../../.env.local.example) · [Documentation home](../README.md)

## Purpose

Step-by-step guide to run Hey Ralli on a developer machine (install, env, migrations, `npm run dev`, common failures).

## Temporary quickstart (until Phase 4)

1. `npm install`
2. `cp .env.local.example .env.local` — fill Supabase (+ OpenAI / Meta / Google as needed)
3. Apply migrations via Supabase (do **not** run only `001` — use the full `supabase/migrations/` set)
4. `npm run dev` → [http://localhost:3000](http://localhost:3000)

Auth redirect: add `http://localhost:3000/auth/callback` in Supabase Auth URL config.

## TODO

- [ ] Full Phase 4 draft (migrations, OAuth localhost URIs, troubleshooting table)
- [ ] Assign owner
