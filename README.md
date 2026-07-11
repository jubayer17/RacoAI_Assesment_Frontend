# Frontend (Vercel)

Next.js + TypeScript UI for Raco AI Assessment.

## Pages

- `/login` — sign in / create account
- `/shop` — product catalog, cart, checkout (requires login)

## Local

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Vercel

1. Root directory = this repo
2. Env: `NEXT_PUBLIC_API_URL` = backend URL (no trailing slash)
3. Deploy

Backend CORS must allow your Vercel domain.
