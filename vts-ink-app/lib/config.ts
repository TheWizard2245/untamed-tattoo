// ============================================================
//  VTS INK — site settings (safe to show in the browser)
//  Secrets (email API key, etc.) live in .env.local, not here.
// ============================================================
export const site = {
  brand: "VTS INK",
  artistName: "Ben",
  shopName: "Untamed Tattoos", // shown on the waiver
  studio: "Untamed Tattoo & Piercing",
  address: "799 South Main St, Bellingham, MA",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=799+South+Main+St+Bellingham+MA",
  instagram: "", // e.g. "https://instagram.com/vtsink" — hidden when empty

  // ---------- Calendar ----------
  workDays: [2, 3, 4, 5, 6], // 0 = Sun ... 6 = Sat
  bookingWindowDays: 120,
  minNoticeDays: 3,
  timeOfDay: ["Morning", "Afternoon", "Evening", "Whatever works"],

  // ---------- Uploads ----------
  maxFilesPerGroup: 8,
  // Photos are resized in the browser to this long edge before upload
  uploadMaxEdge: 1600,

  // TODO: replace with Ben's real policy
  depositPolicy: [
    "A non-refundable deposit is required to lock in your appointment. It comes off the price of your final session.",
    "Reschedule with at least 48 hours' notice and your deposit carries over. Less notice or a no-show forfeits the deposit.",
    "Your design is drawn after the deposit is paid and is shown to you at the appointment.",
  ],
} as const;

export type Site = typeof site;
