# Canva

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 19, 2026  
**Related:** [Integrations](./README.md) · [Feature list](../product/feature-list.md) · [`.env.local.example`](../../.env.local.example) · [Documentation home](../README.md)

Org Canva Connect OAuth is implemented in the repo. **Customer connect and import UI is unshipped for launch** (same spirit as AI Brain): schools should not see Canva as a connect option. Bring the surface back later without redoing OAuth.

## Customer surface (hidden)

- Settings → Integrations does **not** list Canva (Facebook & Instagram + Google Calendar only).
- Settings Overview **Connected** card does not show Canva.
- `/settings/canva` redirects to `/settings/integrations`.
- Create with AI Creative Setup does **not** show Import from Canva / Connect Canva.
- Artwork studio does **not** show Choose from Canva / Connect Canva / Open Canva.

## What stays in the repo

- OAuth start/callback: `/api/canva/oauth/start`, `/api/canva/oauth/callback`
- Client, connection, import, and PKCE helpers under `src/lib/canva/`
- `CanvaConnectionPanel` / `CanvaDesignPicker` components (unmounted from customer chrome)
- Encrypted org tokens (`organization_canva_connections`) — do not revoke production app credentials as part of this hide

## Env (backend only; not a customer setup step)

`CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI` — see [ops/env-and-secrets.md](../ops/env-and-secrets.md). Placeholders: [`.env.local.example`](../../.env.local.example).
