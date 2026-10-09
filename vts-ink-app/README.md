# VTS INK — web app

Next.js (React) version of the biomechanical VTS INK site: landing page,
portfolio, and a five-step booking flow that emails each request to Ben with
the client's photos and signature attached. Installable on phones ("Add to
Home Screen").

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Without email settings, submitted bookings are printed in the terminal
instead of emailed, so you can test freely.

## Go live (Vercel, free tier)

1. Push this repo to GitHub, then at [vercel.com](https://vercel.com) → **Add New Project** →
   import the repo and set **Root Directory** to `vts-ink-app`.
2. Make a free [Resend](https://resend.com) account → **API Keys** → create one.
3. In Vercel → Project → **Settings → Environment Variables**, add (see `.env.example`):
   - `RESEND_API_KEY` — the key from step 2
   - `BOOKING_EMAIL_TO` — Ben's email
   - `BOOKING_EMAIL_FROM` — leave as `VTS INK Bookings <onboarding@resend.dev>` to start.
     Resend's test sender can only deliver to the email you signed up with, so sign
     up with Ben's email, or verify a domain in Resend and use an address on it.
4. Redeploy. Bookings now land in Ben's inbox; replying goes straight to the client.

## Where things live

| Path | What |
|---|---|
| `lib/config.ts` | Settings: studio/address, work days, booking window, deposit policy, Instagram |
| `lib/booking.ts` | Questions, validation (runs in the browser **and** on the server), email summary |
| `app/page.tsx` | Home: logo, Ben, book button |
| `app/portfolio/` + `components/Gallery.tsx` | Portfolio — every image in `public/images/portfolio` (thumbnail of the same name in `public/images/thumbs`) |
| `app/book/` + `components/booking/` | Booking flow: calendar, uploads (shrunk in the browser), signature pad, review |
| `app/api/book/route.ts` | Receives a booking, re-validates it, emails it via Resend |
| `app/api/availability/route.ts` | Calendar hook (see below) |
| `app/globals.css` | Biomech theme |

## Google Calendar (later)

Set `AVAILABILITY_SOURCE_URL` to a service (e.g. a Google Cloud Function reading
Ben's calendar) that answers `GET ?month=2026-11` with
`{ "blocked": ["2026-11-03", "2026-11-04"] }`. Those days grey out in the
calendar automatically.
