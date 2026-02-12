# Sunnyday

Bluesky utility toolkit built with Vue 3 + TypeScript.

## Current v1 scope

- Login with Bluesky handle + app password
- Convert existing list to starter pack
- Convert starter pack to list (new or existing) by searching a user and choosing one of their starter packs
- Curated feed workspace with multiple feed profiles (create/rename/delete)
- Per-feed automation config (words or regex, with case-sensitivity)
- Per-feed curated posts selected from search (add/remove)
- Draft vs published workflow with `Publish` and `Discard changes`
- Light/dark/system theme toggle

## Stack

- Vite
- Vue 3 + TypeScript
- Pinia
- Vue Router
- Tailwind CSS
- `@atproto/api`

## Run

```bash
npm install
npm run dev
```

## Publish Setup

Set `VITE_BSKY_FEEDGEN_DID` in your `.env` file to the DID of your feed-generator service.

Example:

```bash
VITE_BSKY_FEEDGEN_DID=did:web:feeds.yourdomain.com
```

### Nginx + DID bootstrap script

Generate Nginx config, DID document, and env snippet:

```bash
scripts/setup-feed-domain.sh \
  --domain feeds.yourdomain.com \
  --backend http://127.0.0.1:3000
```

It will create:
- `deploy/nginx/feeds.yourdomain.com.conf`
- `deploy/did/.well-known/did.json`
- `deploy/.env.feedgen`

## Notes

- Session tokens are persisted in browser `localStorage` for persistent login.
- App password is used only on login and not intentionally persisted.
- `Publish` now creates/updates a Bluesky `app.bsky.feed.generator` record.
- For feed delivery and discoverability, your feed-generator service/DID must be properly deployed and resolvable.
