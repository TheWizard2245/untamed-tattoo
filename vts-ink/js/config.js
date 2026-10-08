// ============================================================
//  VTS INK — site settings
//  Everything Ben (or you) might need to change lives here.
// ============================================================
window.VTS_CONFIG = {
  brand: "VTS INK",
  artistName: "Ben",
  shopName: "Untamed Tattoos", // shown on the waiver

  // Where finished bookings go.
  // 1. Make a free form at https://formspree.io with Ben's email.
  // 2. Paste its endpoint here, e.g. "https://formspree.io/f/abcdwxyz".
  // While this is empty, Submit falls back to opening the client's email
  // app with the booking pre-written to bookingEmail (no photo attachments).
  formEndpoint: "",
  bookingEmail: "ben@example.com", // TODO: Ben's real email

  // Photo uploads are sent with the form. Formspree needs a paid plan for
  // file uploads — set this to false on the free plan.
  allowUploads: true,

  instagram: "", // e.g. "https://instagram.com/vtsink" — hidden when empty

  // ---------- Calendar ----------
  // Days Ben tattoos (0 = Sun ... 6 = Sat)
  workDays: [2, 3, 4, 5, 6],
  // How far ahead clients can request
  bookingWindowDays: 120,
  // Earliest request: this many days from today
  minNoticeDays: 3,
  timeOfDay: ["Morning", "Afternoon", "Evening", "Whatever works"],

  // Google Calendar hook-up (later). When set, the calendar calls
  //   GET {availabilityUrl}?month=YYYY-MM
  // and expects JSON: { "blocked": ["2026-10-14", "2026-10-15"] }
  // A small Google Cloud Function reading Ben's calendar can serve this.
  availabilityUrl: "",

  // Shown in a "Deposit policy" box the client must agree to.
  // TODO: replace with Ben's real policy.
  depositPolicy: [
    "A non-refundable deposit is required to lock in your appointment. It comes off the price of your final session.",
    "Reschedule with at least 48 hours' notice and your deposit carries over. Less notice or a no-show forfeits the deposit.",
    "Your design is drawn after the deposit is paid and is shown to you at the appointment.",
  ],

  portfolioCount: 57,
};
