// Local-date helpers. Dates are handled as "YYYY-MM-DD" strings to avoid
// time-zone shifts between the browser and the server.
const pad = (n: number) => String(n).padStart(2, "0");

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());

export const pretty = (s: string) =>
  parseISO(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function ageFrom(dob: string, today = startOfToday()): number | null {
  if (!isISODate(dob)) return null;
  const d = parseISO(dob);
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
