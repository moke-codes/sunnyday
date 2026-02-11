# Sunnyday

Bluesky utility toolkit built with Vue 3 + TypeScript.

## Current v1 scope

- Login with Bluesky handle + app password
- Convert existing list to starter pack
- Convert starter pack to list (new or existing) by searching a user and choosing one of their starter packs
- Curated feed workspace with manual selected-post bucket
- Optional moderation mode (approve/reject queue) for automation workflows
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

## Notes

- Session tokens are persisted in browser `localStorage` for persistent login.
- App password is used only on login and not intentionally persisted.
- Feed generator backend is not included in this phase yet.
