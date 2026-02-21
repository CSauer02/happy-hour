# ATL Happy Hour

Atlanta's guide to the best happy hour deals. Filter by day, browse by neighborhood, and find deals happening right now.

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** with custom brand gradient
- **Supabase** for data (falls back to Google Sheets CSV)
- **Google Maps** via @vis.gl/react-google-maps
- **Vercel** for deployment

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (falls back to CSV) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps API key (map shows placeholder without it) |

## Database Setup

Run `supabase/schema.sql` in the Supabase SQL Editor to create the venues table.

## License

This project is released into the public domain.
