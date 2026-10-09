// Booking questions, validation, and summaries — shared by the browser
// (step-by-step checks) and the API route (final check before emailing).
import { site } from "./config";
import { addDays, ageFrom, isISODate, parseISO, pretty, startOfToday } from "./dates";

export const STEP_TITLES = ["Contact Info", "The Tattoo", "Requested Dates", "Medical & Tattoo Release", "Review"] as const;
export const STEP_NAMES = ["Contact", "Your Tattoo", "Pick a Date", "Waiver", "Submit"] as const;

export const CONTACT_PREFS = ["Text", "Call", "Email"] as const;

export const CLIENT_TYPES = [
  { value: "First tattoo ever", label: "This is my first tattoo... like, ever" },
  { value: "First tattoo with Ben", label: "This is my first tattoo with Ben" },
  { value: "Returning client", label: "I've been tattooed by Ben before" },
  { value: "Continuing a piece Ben started", label: "I'm finishing a piece Ben started" },
  { value: "Cover-up / rework", label: "This is a cover-up or rework of an old tattoo" },
] as const;

export const SIZES = [
  'Small (under 3")',
  'Medium (3"–6")',
  'Large (6"–10")',
  'Extra large (10"+)',
  "Half sleeve",
  "Full sleeve",
  "Back / chest piece",
  "Not sure, let Ben decide",
] as const;

export const COLORS = ["Black & grey", "Full color", "Ben's call"] as const;

export const CONDITIONS = [
  "Heart disease",
  "Diabetes",
  "Epilepsy",
  "HIV/AIDS",
  "Hepatitis",
  "High blood pressure",
  "Pregnant",
] as const;
export const NO_CONDITIONS = "None of these";

export const YN = [
  ["over18", "I am 18 years of age or older"],
  ["ate", "Have you eaten within the last 4 hours?"],
  ["alcohol", "Have you consumed alcohol within the last 8 hours?"],
  ["faint", "Are you prone to fainting while receiving tattoos?"],
  ["fear", "Do you have any fear around medical-type procedures?"],
  ["influence", "Are you currently under the influence of drugs or alcohol?"],
  ["thinners", "Are you currently on any blood thinners?"],
  ["aspirin", "Are you currently taking aspirin or ibuprofen?"],
  ["otherCond", "Do you have any conditions not mentioned above that might affect the tattoo application?"],
] as const;
export type YnKey = (typeof YN)[number][0];

export const ACKS = [
  "I understand the tattoo artist cannot be held responsible if my body reacts to the tattoo application.",
  "I understand that the artist's suggestions are not to be confused with medical advice.",
  "I understand that I am fully responsible for the entire aftercare of my tattoo.",
  "I understand only sterile / single-use equipment will be used during the procedure.",
  "I understand any mistakes made due to my moving during the procedure are not the responsibility of the artist.",
] as const;

export type Answers = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactPref: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  heardFrom: string;

  clientType: string[];
  placement: string;
  size: string;
  budget: string;
  color: string;
  description: string;
  policyAgree: boolean;

  picks: string[];
  timeOfDay: string;
  shortNotice: boolean;

  conditions: string[];
  yn: Partial<Record<YnKey, "Yes" | "No">>;
  otherSpecify: string;
  acks: boolean[];
  sigName: string;
};

export const emptyAnswers = (): Answers => ({
  firstName: "", lastName: "", email: "", phone: "", contactPref: "", address: "", city: "", state: "", zip: "", dob: "", heardFrom: "",
  clientType: [], placement: "", size: "", budget: "", color: "", description: "", policyAgree: false,
  picks: [], timeOfDay: "", shortNotice: false,
  conditions: [], yn: {}, otherSpecify: "", acks: ACKS.map(() => false), sigName: "",
});

// ---------- Calendar rules ----------
export function bookableRange(today = startOfToday()) {
  return { min: addDays(today, site.minNoticeDays), max: addDays(today, site.bookingWindowDays) };
}

export function isBookable(day: string, blocked: ReadonlySet<string> = new Set(), today = startOfToday()) {
  if (!isISODate(day)) return false;
  const d = parseISO(day);
  const { min, max } = bookableRange(today);
  return d >= min && d <= max && (site.workDays as readonly number[]).includes(d.getDay()) && !blocked.has(day);
}

// ---------- Validation ----------
export type FieldError = { field: string; msg: string };

const req = (v: string) => v.trim().length > 0;

export function validateStep(step: number, a: Answers, opts: { hasSignature: boolean }): FieldError[] {
  const e: FieldError[] = [];
  const need = (field: keyof Answers, label: string) => {
    if (!req(String(a[field] ?? ""))) e.push({ field, msg: `${label} is required.` });
  };

  if (step === 0) {
    need("firstName", "First name");
    need("lastName", "Last name");
    need("email", "Email");
    if (req(a.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim())) e.push({ field: "email", msg: "That email address doesn't look right." });
    need("phone", "Phone");
    const digits = a.phone.replace(/\D/g, "");
    if (req(a.phone) && (digits.length < 10 || digits.length > 15)) e.push({ field: "phone", msg: "Phone number needs at least 10 digits." });
    if (!CONTACT_PREFS.includes(a.contactPref as (typeof CONTACT_PREFS)[number])) e.push({ field: "contactPref", msg: "Pick the best way to reach you." });
    need("address", "Street address");
    need("city", "City");
    need("state", "State");
    need("zip", "Zip code");
    if (req(a.zip) && !/^\d{5}(-?\d{4})?$/.test(a.zip.trim())) e.push({ field: "zip", msg: "Zip code should be 5 digits." });
    need("dob", "Date of birth");
    if (req(a.dob)) {
      const age = ageFrom(a.dob);
      if (age === null || age < 0 || age > 120) e.push({ field: "dob", msg: "Double-check your date of birth." });
      else if (age < 18) e.push({ field: "dob", msg: "You must be 18 or older to book." });
    }
  }

  if (step === 1) {
    need("placement", "Placement");
    if (!SIZES.includes(a.size as (typeof SIZES)[number])) e.push({ field: "size", msg: "Choose an approximate size." });
    if (!COLORS.includes(a.color as (typeof COLORS)[number])) e.push({ field: "color", msg: "Choose color or black & grey." });
    need("description", "Tattoo description");
    if (!a.policyAgree) e.push({ field: "policyAgree", msg: "Please agree to the deposit policy." });
  }

  if (step === 2) {
    if (!a.picks.length) e.push({ field: "picks", msg: "Pick at least one day on the calendar." });
    else if (a.picks.length > 3 || a.picks.some((p) => !isBookable(p))) e.push({ field: "picks", msg: "One of your picked days isn't available anymore. Pick again." });
    if (!site.timeOfDay.includes(a.timeOfDay as (typeof site.timeOfDay)[number])) e.push({ field: "timeOfDay", msg: "Pick a time of day." });
  }

  if (step === 3) {
    if (!a.conditions.length) e.push({ field: "conditions", msg: 'Check any conditions that apply, or check "None of these".' });
    for (const [k, q] of YN) if (!a.yn[k]) e.push({ field: `yn.${k}`, msg: `Answer: "${q}"` });
    if (a.yn.over18 === "No") e.push({ field: "yn.over18", msg: "You must be 18 or older to be tattooed." });
    if (a.yn.otherCond === "Yes" && !req(a.otherSpecify)) e.push({ field: "otherSpecify", msg: "Please specify your other conditions." });
    if (a.acks.length !== ACKS.length || a.acks.some((x) => !x)) e.push({ field: "acks", msg: "Check all five acknowledgment boxes." });
    if (!opts.hasSignature) e.push({ field: "signature", msg: "Sign in the signature box." });
    need("sigName", "Typed full name");
  }

  return e;
}

export function validateAll(a: Answers, opts: { hasSignature: boolean }) {
  for (let s = 0; s < 4; s++) {
    const errs = validateStep(s, a, opts);
    if (errs.length) return { step: s, errors: errs };
  }
  return null;
}

// ---------- Readable summary (review screen + email) ----------
export type Section = { title: string; step: number; items: { label: string; value: string }[] };

export function summarize(a: Answers, extras: { areaFiles: string[]; refFiles: string[]; signedOn: string }): Section[] {
  const files = (list: string[]) => (list.length ? `${list.length} file(s): ${list.join(", ")}` : "None");
  const age = ageFrom(a.dob);
  const clean = (items: { label: string; value: string }[]) => items.filter((i) => i.value.trim());
  return [
    {
      title: STEP_TITLES[0], step: 0, items: clean([
        { label: "Name", value: `${a.firstName} ${a.lastName}`.trim() },
        { label: "Email", value: a.email },
        { label: "Phone", value: a.phone },
        { label: "Best Way to Reach", value: a.contactPref },
        { label: "Address", value: `${a.address}, ${a.city}, ${a.state} ${a.zip}` },
        { label: "Date of Birth", value: a.dob ? pretty(a.dob) : "" },
        { label: "Age", value: age === null ? "" : String(age) },
        { label: "Heard About Ben From", value: a.heardFrom },
      ]),
    },
    {
      title: STEP_TITLES[1], step: 1, items: clean([
        { label: "About Them", value: a.clientType.join(", ") },
        { label: "Placement", value: a.placement },
        { label: "Size", value: a.size },
        { label: "Color", value: a.color },
        { label: "Budget", value: a.budget },
        { label: "Tattoo Idea", value: a.description },
        { label: "Photos of the Area", value: files(extras.areaFiles) },
        { label: "Reference Images", value: files(extras.refFiles) },
        { label: "Deposit Policy", value: a.policyAgree ? "Agreed" : "" },
      ]),
    },
    {
      title: STEP_TITLES[2], step: 2, items: clean([
        ...a.picks.map((p, i) => ({ label: ["1st choice", "2nd choice", "3rd choice"][i], value: pretty(p) })),
        { label: "Time of Day", value: a.timeOfDay },
        { label: "Short Notice", value: a.shortNotice ? "Yes, text if something opens up" : "" },
      ]),
    },
    {
      title: STEP_TITLES[3], step: 3, items: clean([
        { label: "Medical Conditions", value: a.conditions.join(", ") },
        ...YN.map(([k, q]) => ({ label: q, value: a.yn[k] ?? "" })),
        { label: "Other Conditions (details)", value: a.yn.otherCond === "Yes" ? a.otherSpecify : "" },
        { label: "Acknowledgments", value: a.acks.every(Boolean) ? "All 5 agreed" : "" },
        { label: "Signed Name", value: a.sigName },
        { label: "Date Signed", value: extras.signedOn },
      ]),
    },
  ];
}
