"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/config";
import {
  ACKS, CLIENT_TYPES, COLORS, CONDITIONS, CONTACT_PREFS, NO_CONDITIONS, SIZES, STEP_NAMES, STEP_TITLES, YN,
  emptyAnswers, isBookable, summarize, validateAll, validateStep, type Answers, type FieldError,
} from "@/lib/booking";
import { ageFrom, longDate, pretty, startOfToday } from "@/lib/dates";
import { dataUrlToBlob, type UploadItem } from "@/lib/images";
import Calendar from "./Calendar";
import SignaturePad, { type SignatureHandle } from "./SignaturePad";
import Uploader from "./Uploader";
import { CheckGroup, Checkbox, RadioGroup, TextField, YesNo } from "./fields";

const DRAFT_KEY = "vtsink-app-booking-draft";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // keep total request under host limits

export default function BookingFlow() {
  const [a, setA] = useState<Answers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [area, setArea] = useState<UploadItem[]>([]);
  const [refs, setRefs] = useState<UploadItem[]>([]);
  const [hasSig, setHasSig] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const sig = useRef<SignatureHandle>(null);
  const progressRef = useRef<HTMLOListElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const signedOn = useMemo(() => longDate(startOfToday()), []);

  const set = useCallback(<K extends keyof Answers>(k: K, v: Answers[K]) => {
    setA((prev) => ({ ...prev, [k]: v }));
    setErrors([]);
  }, []);
  const setPicks = useCallback((p: string[]) => set("picks", p), [set]);
  const bad = (field: string) => errors.some((e) => e.field === field || e.field.startsWith(field + "."));

  // ---------- Draft autosave (this device only; no photos / signature) ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = { ...emptyAnswers(), ...JSON.parse(raw) } as Answers;
        setA({ ...saved, picks: saved.picks.filter((p) => isBookable(p)) });
      }
    } catch { /* storage unavailable or bad JSON */ }
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady || done) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(a)); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [a, draftReady, done]);

  // ---------- Navigation ----------
  function go(i: number) {
    setErrors([]);
    setStep(i);
    if (i === 3 && !a.sigName.trim()) set("sigName", `${a.firstName} ${a.lastName}`.trim());
    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      headings.current[i]?.focus({ preventScroll: true });
    });
  }

  function showErrors(errs: FieldError[]) {
    setErrors(errs);
    requestAnimationFrame(() => {
      const first = document.querySelector(".step.active .invalid, .step.active [aria-invalid=true]");
      (first ?? errorsRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function next() {
    const errs = validateStep(step, a, { hasSignature: hasSig });
    if (errs.length) return showErrors(errs);
    go(step + 1);
  }

  // ---------- Submit ----------
  async function submit() {
    const fail = validateAll(a, { hasSignature: hasSig });
    if (fail) { go(fail.step); setTimeout(() => showErrors(fail.errors), 50); return; }

    const uploads = [...area, ...refs];
    const total = uploads.reduce((n, u) => n + u.blob.size, 0);
    if (total > MAX_UPLOAD_BYTES) {
      showErrors([{ field: "uploads", msg: "Your photos add up to more than 4 MB. Remove a few and try again." }]);
      return;
    }

    setSending(true);
    setErrors([]);
    const fd = new FormData();
    fd.append("answers", JSON.stringify(a));
    area.forEach((u) => fd.append("area", u.blob, u.name));
    refs.forEach((u) => fd.append("ref", u.blob, u.name));
    fd.append("signature", dataUrlToBlob(sig.current!.toDataURL()), "signature.png");

    try {
      const res = await fetch("/api/book", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || `Server error ${res.status}`);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone(`Thanks, ${a.firstName}! Your request is in. Ben will look it over and reach out by ${a.contactPref.toLowerCase() || "email"} to confirm your date and deposit.`);
      requestAnimationFrame(() => progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      showErrors([{ field: "submit", msg: `That didn't go through: ${(e as Error).message}. Check your connection and try again.` }]);
    } finally {
      setSending(false);
    }
  }

  function startOver() {
    if (!confirm("Clear everything and start over?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    location.reload();
  }

  const age = ageFrom(a.dob);
  const sections = step === 4 ? summarize(a, { areaFiles: area.map((u) => u.name), refFiles: refs.map((u) => u.name), signedOn }) : [];
  const h2 = (i: number, text: string) => (
    <h2 tabIndex={-1} ref={(el) => { headings.current[i] = el; }}>{text}</h2>
  );

  return (
    <div className="booking">
      <ol className="progress" ref={progressRef}>
        {STEP_NAMES.map((n, i) => (
          <li key={n} className={done ? "done" : i === step ? "active" : i < step ? "done" : ""}>
            <span className="dot">{i + 1}</span>
            <span className="name">{n}</span>
          </li>
        ))}
      </ol>

      <form className="panel" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {done ? (
          <section className="step success active" aria-live="polite">
            <h2 tabIndex={-1}>You&apos;re On The List!</h2>
            <p>{done}</p>
            <Link className="btn btn-ghost" href="/"><span>BACK HOME</span></Link>
          </section>
        ) : (
          <>
            {/* ===== STEP 1: CONTACT ===== */}
            <section className={`step${step === 0 ? " active" : ""}`} aria-label={STEP_TITLES[0]}>
              {h2(0, "Who's Getting Inked?")}
              <p className="sub">So Ben knows who you are and how to reach you.</p>
              <div className="row">
                <TextField label="First Name" required value={a.firstName} onChange={(v) => set("firstName", v)} autoComplete="given-name" invalid={bad("firstName")} />
                <TextField label="Last Name" required value={a.lastName} onChange={(v) => set("lastName", v)} autoComplete="family-name" invalid={bad("lastName")} />
              </div>
              <div className="row">
                <TextField label="Email" type="email" inputMode="email" required value={a.email} onChange={(v) => set("email", v)} autoComplete="email" invalid={bad("email")} />
                <TextField label="Phone" type="tel" inputMode="tel" required placeholder="(555) 555-5555" value={a.phone} onChange={(v) => set("phone", v)} autoComplete="tel" invalid={bad("phone")} />
              </div>
              <RadioGroup legend="Best Way to Reach You" name="contactPref" required cols invalid={bad("contactPref")}
                options={CONTACT_PREFS.map((v) => ({ value: v, label: v }))} value={a.contactPref} onChange={(v) => set("contactPref", v)} />
              <TextField label="Street Address" required value={a.address} onChange={(v) => set("address", v)} autoComplete="street-address" invalid={bad("address")} />
              <div className="row-3">
                <TextField label="City" required value={a.city} onChange={(v) => set("city", v)} autoComplete="address-level2" invalid={bad("city")} />
                <TextField label="State" required maxLength={20} value={a.state} onChange={(v) => set("state", v)} autoComplete="address-level1" invalid={bad("state")} />
                <TextField label="Zip" required inputMode="numeric" maxLength={10} value={a.zip} onChange={(v) => set("zip", v)} autoComplete="postal-code" invalid={bad("zip")} />
              </div>
              <div className="row">
                <TextField label="Date of Birth" type="date" required value={a.dob} onChange={(v) => set("dob", v)} autoComplete="bday" invalid={bad("dob")} />
                <TextField label="Age" readOnly tabIndex={-1} placeholder="Fills in from birthday" value={age === null || age < 0 ? "" : String(age)} onChange={() => {}} />
              </div>
              {age !== null && age >= 0 && age < 18 && (
                <p className="block-msg show">Sorry, no one under 18 will be tattooed. Come back and see Ben when you&apos;re 18!</p>
              )}
              <TextField label="How'd You Hear About Ben?" placeholder="Instagram, a friend, saw his work..." value={a.heardFrom} onChange={(v) => set("heardFrom", v)} />
            </section>

            {/* ===== STEP 2: THE TATTOO ===== */}
            <section className={`step${step === 1 ? " active" : ""}`} aria-label={STEP_TITLES[1]}>
              {h2(1, "Tell Ben The Idea")}
              <p className="sub">The more detail you give, the better the design. Don&apos;t stress about getting it perfect.</p>
              <CheckGroup legend="Check Any That Apply" options={CLIENT_TYPES} value={a.clientType} onChange={(v) => set("clientType", v)} />
              <TextField label="Placement" required hint="Where's it going? Forearm, calf, chest, back, ribs..." value={a.placement} onChange={(v) => set("placement", v)} invalid={bad("placement")} />
              <div className="row">
                <div className={`field${bad("size") ? " invalid" : ""}`}>
                  <label className="req" htmlFor="size">Approximate Size</label>
                  <select id="size" value={a.size} onChange={(e) => set("size", e.target.value)}>
                    <option value="">Choose one...</option>
                    {SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <TextField label="Budget" placeholder="Have a number in mind? No budget?" value={a.budget} onChange={(v) => set("budget", v)} />
              </div>
              <RadioGroup legend="Color or Black & Grey?" name="color" required cols invalid={bad("color")}
                options={COLORS.map((v) => ({ value: v, label: v }))} value={a.color} onChange={(v) => set("color", v)} />
              <TextField label="Describe Your Tattoo Idea" required multiline
                hint="Subject, mood, style, anything that has to be in it, anything you definitely don't want."
                value={a.description} onChange={(v) => set("description", v)} invalid={bad("description")} />
              <Uploader label="Photos of the Area" cta="UPLOAD PHOTOS" items={area} onChange={setArea}
                hint="Shoot a few angles of the spot, with a ruler or tape measure in frame for scale. Include any existing tattoo if it's a cover-up." />
              <Uploader label="Reference Images" cta="UPLOAD REFERENCES" items={refs} onChange={setRefs}
                hint="Pics that show the vibe: other art, photos, sketches, pieces you like." />
              <fieldset className={`field${bad("policyAgree") ? " invalid" : ""}`}>
                <legend className="req">Deposit Policy</legend>
                <div className="policy"><ul>{site.depositPolicy.map((p) => <li key={p}>{p}</li>)}</ul></div>
                <Checkbox checked={a.policyAgree} onChange={(v) => set("policyAgree", v)}>I&apos;ve read and agree to the deposit policy above.</Checkbox>
              </fieldset>
            </section>

            {/* ===== STEP 3: CALENDAR ===== */}
            <section className={`step${step === 2 ? " active" : ""}`} aria-label={STEP_TITLES[2]}>
              {h2(2, "Pick Your Days")}
              <p className="sub">Tap up to 3 days that work for you, in order of preference. Greyed-out days aren&apos;t available. Your date is locked in once Ben confirms it and your deposit is paid.</p>
              <Calendar picks={a.picks} onChange={setPicks} invalid={bad("picks")} />
              <div className="row" style={{ marginTop: 18 }}>
                <RadioGroup legend="Time of Day" name="timeOfDay" required invalid={bad("timeOfDay")}
                  options={site.timeOfDay.map((v) => ({ value: v, label: v }))} value={a.timeOfDay} onChange={(v) => set("timeOfDay", v)} />
                <div className="field">
                  <span className="label">Flexible?</span>
                  <Checkbox checked={a.shortNotice} onChange={(v) => set("shortNotice", v)}>Text me if something opens up last minute</Checkbox>
                </div>
              </div>
            </section>

            {/* ===== STEP 4: WAIVER ===== */}
            <section className={`step${step === 3 ? " active" : ""}`} aria-label={STEP_TITLES[3]}>
              {h2(3, "The Release Form")}
              <div className="waiver-head">
                <div>
                  <div className="shop">{site.shopName}</div>
                  <div className="doc">Medical &amp; Tattoo Release Form</div>
                </div>
                <div className="artist">Procedure done by: {site.artistName}</div>
              </div>
              <span className="notice-18">No one under 18 will be tattooed here!</span>
              <div className="who">
                {[
                  ["Name", `${a.firstName} ${a.lastName}`],
                  ["Address", a.address],
                  ["City / State / Zip", `${a.city}, ${a.state} ${a.zip}`],
                  ["Date of Birth", a.dob ? pretty(a.dob) : ""],
                  ["Age", age === null ? "" : String(age)],
                  ["Email", a.email],
                  ["Phone", a.phone],
                ].map(([k, v]) => <div key={k}>{k}: <b>{v}</b></div>)}
              </div>

              <CheckGroup legend="Check Any Conditions That Apply To You" required cols invalid={bad("conditions")}
                options={[...CONDITIONS, NO_CONDITIONS].map((v) => ({ value: v, label: v }))}
                value={a.conditions}
                onChange={(v) => {
                  const addedNone = v.includes(NO_CONDITIONS) && !a.conditions.includes(NO_CONDITIONS);
                  set("conditions", addedNone ? [NO_CONDITIONS] : v.filter((x) => x !== NO_CONDITIONS || v.length === 1));
                }} />

              <fieldset className="field">
                <legend className="req">Answer Yes or No</legend>
                <span className="hint">Answer for today. You&apos;ll confirm again on the day of your appointment.</span>
                {YN.map(([k, q]) => (
                  <YesNo key={k} id={k} question={q} value={a.yn[k]} invalid={bad(`yn.${k}`)}
                    onChange={(v) => set("yn", { ...a.yn, [k]: v })} />
                ))}
                {a.yn.over18 === "No" && <p className="block-msg show">You must be 18 or older to be tattooed at {site.shopName}.</p>}
              </fieldset>

              {a.yn.otherCond === "Yes" && (
                <TextField label="Please Specify" required multiline value={a.otherSpecify} onChange={(v) => set("otherSpecify", v)} invalid={bad("otherSpecify")} />
              )}

              <fieldset className={`field${bad("acks") ? " invalid" : ""}`}>
                <legend className="req">Check Each Box To Agree</legend>
                <div className="checks">
                  {ACKS.map((t, i) => (
                    <Checkbox key={i} checked={a.acks[i]} onChange={(v) => set("acks", a.acks.map((x, j) => (j === i ? v : x)))}>{t}</Checkbox>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <span className="label req">Signature</span>
                <span className="hint">Sign with your finger or mouse.</span>
                <SignaturePad ref={sig} onInk={(h) => { setHasSig(h); setErrors([]); }} invalid={bad("signature")} active={step === 3} />
              </div>
              <div className="row">
                <TextField label="Type Your Full Name" required value={a.sigName} onChange={(v) => set("sigName", v)} autoComplete="name" invalid={bad("sigName")} />
                <TextField label="Date" readOnly tabIndex={-1} value={signedOn} onChange={() => {}} />
              </div>
              <p className="hint">All aftercare instructions, along with recommended products to use, will be given by your artist.</p>
            </section>

            {/* ===== STEP 5: REVIEW ===== */}
            <section className={`step${step === 4 ? " active" : ""}`} aria-label={STEP_TITLES[4]}>
              {h2(4, "Look It Over")}
              <p className="sub">Double-check everything, then send it to Ben.</p>
              {sections.map((sec) => (
                <div className="review-block" key={sec.title}>
                  <h3>{sec.title} <button type="button" onClick={() => go(sec.step)}>EDIT</button></h3>
                  <dl>
                    {sec.items.map((it) => (
                      <div key={it.label} style={{ display: "contents" }}>
                        <dt>{it.label}</dt>
                        <dd>{it.value}</dd>
                      </div>
                    ))}
                    {sec.step === 3 && hasSig && step === 4 && (
                      <>
                        <dt>Signature</dt>
                        <dd><img className="sig" src={sig.current?.toDataURL()} alt="Your signature" /></dd>
                      </>
                    )}
                  </dl>
                </div>
              ))}
            </section>

            <div className={`errors${errors.length ? " show" : ""}`} role="alert" ref={errorsRef} tabIndex={-1}>
              {errors.length > 0 && (
                <>
                  <strong>Fix these and try again:</strong>
                  <ul>{errors.map((e, i) => <li key={i}>{e.msg}</li>)}</ul>
                </>
              )}
            </div>

            <div className="step-nav">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}><span>&larr; BACK</span></button>}
              <span className="spacer" />
              {step < 4 ? (
                <button type="button" className="btn" onClick={next}><span>NEXT &rarr;</span></button>
              ) : (
                <button type="submit" className="btn" disabled={sending}><span>{sending ? "SENDING..." : "SUBMIT TO BEN"}</span></button>
              )}
            </div>
            {sending && <p className="sending-note">Uploading your photos and signature...</p>}
          </>
        )}
      </form>

      {!done && (
        <p className="draft-note">
          Your answers save on this device as you go (not your photos or signature).{" "}
          <button type="button" onClick={startOver}>Start over</button>
        </p>
      )}
    </div>
  );
}
