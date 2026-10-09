// POST /api/book — receives a finished booking, re-checks it, and emails it
// to Ben (with photos + signature attached) through Resend.
import { NextResponse } from "next/server";
import { site } from "@/lib/config";
import { emptyAnswers, summarize, validateAll, YN, type Answers, type Section } from "@/lib/booking";
import { longDate, startOfToday } from "@/lib/dates";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4.4 * 1024 * 1024;

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 200)).slice(0, 20) : []);

// Only accept the fields we know about, with the right types.
function coerce(raw: unknown): Answers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = emptyAnswers();
  const yn: Answers["yn"] = {};
  const rawYn = (r.yn && typeof r.yn === "object" ? r.yn : {}) as Record<string, unknown>;
  for (const [k] of YN) if (rawYn[k] === "Yes" || rawYn[k] === "No") yn[k] = rawYn[k];
  return {
    ...base,
    firstName: str(r.firstName, 80), lastName: str(r.lastName, 80), email: str(r.email, 200), phone: str(r.phone, 40),
    contactPref: str(r.contactPref, 20), address: str(r.address, 200), city: str(r.city, 100), state: str(r.state, 40),
    zip: str(r.zip, 12), dob: str(r.dob, 10), heardFrom: str(r.heardFrom, 300),
    clientType: strArr(r.clientType), placement: str(r.placement, 300), size: str(r.size, 60), budget: str(r.budget, 200),
    color: str(r.color, 40), description: str(r.description, 5000), policyAgree: r.policyAgree === true,
    picks: strArr(r.picks).slice(0, 3), timeOfDay: str(r.timeOfDay, 40), shortNotice: r.shortNotice === true,
    conditions: strArr(r.conditions), yn, otherSpecify: str(r.otherSpecify, 2000),
    acks: Array.isArray(r.acks) ? base.acks.map((_, i) => (r.acks as unknown[])[i] === true) : base.acks,
    sigName: str(r.sigName, 160),
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailHtml(sections: Section[], name: string) {
  const blocks = sections.map((sec) => `
    <h2 style="font:700 15px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#4d7d00;margin:26px 0 8px;border-bottom:2px solid #b6ff1a;padding-bottom:4px">${esc(sec.title)}</h2>
    <table style="border-collapse:collapse;width:100%;font:14px Arial,sans-serif">
      ${sec.items.map((it) => `<tr><td style="padding:5px 12px 5px 0;color:#666;vertical-align:top;width:38%">${esc(it.label)}</td><td style="padding:5px 0;color:#111;white-space:pre-wrap">${esc(it.value)}</td></tr>`).join("")}
    </table>`).join("");
  return `<div style="max-width:640px;margin:0 auto;padding:20px">
    <div style="background:#060807;color:#b6ff1a;font:900 20px Arial,sans-serif;letter-spacing:3px;padding:16px 20px">VTS//INK &mdash; NEW BOOKING REQUEST</div>
    <p style="font:15px Arial,sans-serif;color:#111">${esc(name)} sent a booking request. Their signature, area photos, and reference images are attached. Hit reply to answer them directly.</p>
    ${blocks}
  </div>`;
}

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, error: "Couldn't read the form" }, { status: 400 }); }

  let answers: Answers;
  try { answers = coerce(JSON.parse(str(form.get("answers"), 50_000))); } catch { return NextResponse.json({ ok: false, error: "Bad form data" }, { status: 400 }); }

  const asFiles = (k: string) => form.getAll(k).filter((f): f is File => f instanceof File && f.size > 0);
  const area = asFiles("area").slice(0, site.maxFilesPerGroup);
  const refs = asFiles("ref").slice(0, site.maxFilesPerGroup);
  const signature = asFiles("signature")[0];

  const all = [...area, ...refs, ...(signature ? [signature] : [])];
  if (all.some((f) => f.size > MAX_FILE_BYTES) || all.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES)
    return NextResponse.json({ ok: false, error: "Photos are too large. Remove a few and try again." }, { status: 413 });
  if ([...area, ...refs].some((f) => !/^image\/|^application\/pdf$/.test(f.type)))
    return NextResponse.json({ ok: false, error: "Only images and PDFs can be uploaded." }, { status: 400 });

  const invalid = validateAll(answers, { hasSignature: !!signature && signature.type === "image/png" });
  if (invalid) return NextResponse.json({ ok: false, error: invalid.errors.map((e) => e.msg).join(" "), step: invalid.step }, { status: 422 });

  const name = `${answers.firstName} ${answers.lastName}`.trim();
  const sections = summarize(answers, { areaFiles: area.map((f) => f.name), refFiles: refs.map((f) => f.name), signedOn: longDate(startOfToday()) });

  const attach = async (f: File, prefix: string, i: number) => ({
    filename: `${prefix}-${i + 1}-${f.name.replace(/[^\w.-]+/g, "_")}`,
    content: Buffer.from(await f.arrayBuffer()).toString("base64"),
  });
  const attachments = [
    ...(signature ? [{ filename: `signature-${name.replace(/\s+/g, "-")}.png`, content: Buffer.from(await signature.arrayBuffer()).toString("base64") }] : []),
    ...(await Promise.all(area.map((f, i) => attach(f, "area", i)))),
    ...(await Promise.all(refs.map((f, i) => attach(f, "reference", i)))),
  ];

  const key = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_EMAIL_TO;
  const from = process.env.BOOKING_EMAIL_FROM || "VTS INK Bookings <onboarding@resend.dev>";

  if (!key || !to) {
    if (process.env.NODE_ENV !== "production") {
      // Local dev without email set up: log instead of sending.
      console.log(`\n[book] Email not configured. Booking from ${name}:\n` +
        sections.map((s) => `== ${s.title} ==\n` + s.items.map((i) => `  ${i.label}: ${i.value}`).join("\n")).join("\n") +
        `\n  Attachments: ${attachments.map((a) => a.filename).join(", ")}\n`);
      return NextResponse.json({ ok: true, dev: true });
    }
    return NextResponse.json({ ok: false, error: "Booking email isn't set up yet. Please contact the shop directly." }, { status: 503 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()),
      reply_to: answers.email,
      subject: `VTS INK booking request: ${name}`,
      html: emailHtml(sections, name),
      attachments,
    }),
  });
  if (!res.ok) {
    console.error("[book] Resend error", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ ok: false, error: "The booking couldn't be emailed. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
