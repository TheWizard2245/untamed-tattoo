# VTS INK booking site

Ben's client-facing site: logo landing page → portfolio → booking flow
(contact → tattoo questionnaire → calendar → Untamed Tattoos release form → review & submit).

Open `index.html` in a browser to preview. No build step.

## Files

| File | What it is |
|---|---|
| `index.html` | Landing page: logo, Ben's photo + portfolio link, "Book your session now!" |
| `portfolio.html` | Gallery of all 57 pieces with a full-screen viewer |
| `book.html` | The booking flow |
| `js/config.js` | **All the settings**: email, form endpoint, work days, deposit policy, Instagram |
| `js/book.js` | Booking logic (validation, calendar, uploads, signature, submit) |
| `css/styles.css` | Graffiti theme |
| `images/` | Resized copies of the photos from the `VTS ink` folder |

## Before going live

1. **Ben's email**: in `js/config.js`, set `bookingEmail`.
2. **Email delivery**: create a free form at [formspree.io](https://formspree.io) using Ben's email,
   then paste its URL into `formEndpoint`. Until then, Submit opens the client's own
   email app with the booking pre-written (no photos).
   - Photo uploads + the signature image need Formspree's paid plan. On the free plan set
     `allowUploads: false` (the signature is then sent as image data text).
3. **Deposit policy**: replace the placeholder `depositPolicy` lines.
4. **Work days / notice**: `workDays`, `minNoticeDays`, `bookingWindowDays`.
5. **Instagram** (optional): `instagram`.

## Google Calendar (later)

The calendar is ready for a live feed. Set `availabilityUrl` in `config.js` to an endpoint
(e.g. a Google Cloud Function that reads Ben's calendar) that responds to

```
GET {availabilityUrl}?month=2026-11
→ { "blocked": ["2026-11-03", "2026-11-04"] }
```

Blocked days grey out automatically. Each submission also carries
`Requested Dates (ISO)` (e.g. `2026-11-05, 2026-11-07`) so a backend can create
calendar events that sync to Ben's phone once he confirms.
