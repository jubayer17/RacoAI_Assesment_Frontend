# Frontend (Vercel)

Next.js + TypeScript + Tailwind CSS UI for Raco AI Assessment.

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
2. Env vars:
   - `NEXT_PUBLIC_API_URL` = your ngrok/backend URL (no trailing slash)
   - optional: `BACKEND_URL` = same value (used by the server proxy)
3. Deploy

The browser calls same-origin `/api/proxy/...` so CORS/ngrok interstitial issues are avoided.
Backend CORS must still allow local `npm run dev` origins when not using the proxy.
