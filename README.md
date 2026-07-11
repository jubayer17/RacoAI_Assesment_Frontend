# Frontend (Vercel)

Next.js + TypeScript (TSX) UI for the Raco AI Assessment backend.

## Local

```powershell
cd client
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Stack

- Next.js 14 (App Router)
- React 18
- TypeScript / `.tsx`

## Vercel

1. Import this `client` directory as the Vercel project root
2. Set env:
   - `NEXT_PUBLIC_API_URL` = your backend/ngrok URL (no trailing slash)
3. Deploy

Make sure backend `CORS_ALLOWED_ORIGINS` includes your Vercel domain.
