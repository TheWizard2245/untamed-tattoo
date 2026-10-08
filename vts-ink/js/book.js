// ============================================================
//  VTS INK — booking flow
//  Steps: contact → tattoo → calendar → waiver → review/submit
// ============================================================
(function () {
  const cfg = window.VTS_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const form = $("#booking-form");
  const steps = $$(".step[data-step]");
  const progress = $$("#progress li");
  const errorsBox = $("#errors");
  const backBtn = $("#back-btn");
  const nextBtn = $("#next-btn");
  const submitBtn = $("#submit-btn");
  const DRAFT_KEY = "vtsink-booking-draft";
  let current = 0;

  // ---------- Helpers ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const pretty = (s) => parseISO(s).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const val = (id) => ($("#" + id)?.value || "").trim();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  function ageFrom(dobStr) {
    if (!dobStr) return null;
    const d = parseISO(dobStr);
    let a = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
    return a;
  }

  // ---------- Static content from config ----------
  $("#policy-list").innerHTML = cfg.depositPolicy.map((p) => `<li>${esc(p)}</li>`).join("");
  $$("[data-shop-name]").forEach((el) => (el.textContent = cfg.shopName));
  $("#tod").innerHTML = cfg.timeOfDay
    .map((t) => `<label class="check"><input type="radio" name="timeOfDay" value="${esc(t)}"> ${esc(t)}</label>`)
    .join("");
  $("#sigDate").value = today.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  // ---------- Waiver yes/no questions ----------
  const YN = [
    ["over18", "I am 18 years of age or older"],
    ["ate", "Have you eaten within the last 4 hours?"],
    ["alcohol", "Have you consumed alcohol within the last 8 hours?"],
    ["faint", "Are you prone to fainting while receiving tattoos?"],
    ["fear", "Do you have any fear around medical-type procedures?"],
    ["influence", "Are you currently under the influence of drugs or alcohol?"],
    ["thinners", "Are you currently on any blood thinners?"],
    ["aspirin", "Are you currently taking aspirin or ibuprofen?"],
    ["otherCond", "Do you have any conditions not mentioned above that might affect the tattoo application?"],
  ];
  $("#yn-list").innerHTML = YN.map(([k, q]) => `
    <div class="yn" data-yn="${k}">
      <span class="q" id="q-${k}">${esc(q)}</span>
      <div class="opts" role="radiogroup" aria-labelledby="q-${k}">
        <label><input type="radio" name="yn_${k}" value="Yes" data-label="${esc(q)}">YES</label>
        <label><input type="radio" name="yn_${k}" value="No" data-label="${esc(q)}">NO</label>
      </div>
    </div>`).join("");

  const ynVal = (k) => $(`[name="yn_${k}"]:checked`)?.value;

  function syncWaiverRules() {
    const other = ynVal("otherCond") === "Yes";
    $("#otherSpecify-field").hidden = !other;
    $("#otherSpecify").required = other;
    $("#not18-msg").classList.toggle("show", ynVal("over18") === "No");
  }
  form.addEventListener("change", (e) => { if (e.target.name?.startsWith("yn_")) syncWaiverRules(); });

  // "None of these" is exclusive with the other conditions
  $("#conditions").addEventListener("change", (e) => {
    const none = $("[data-none]");
    if (e.target === none && none.checked) $$("[name=conditions]").forEach((c) => c !== none && (c.checked = false));
    else if (e.target !== none && e.target.checked) none.checked = false;
  });

  // ---------- Age from DOB ----------
  function syncAge() {
    const a = ageFrom(val("dob"));
    $("#age").value = a === null || a < 0 ? "" : a;
    $("#under18-msg").classList.toggle("show", a !== null && a >= 0 && a < 18);
  }
  $("#dob").addEventListener("change", syncAge);
  $("#dob").max = iso(today);

  // ---------- Uploads ----------
  const files = { area: [], ref: [] };
  const MAX_FILES = 10;
  const MAX_MB = 10;

  if (!cfg.allowUploads) {
    $$("[data-upload-field]").forEach((el) => (el.hidden = true));
    $("#no-upload-note").hidden = false;
  }

  function addFiles(kind, list) {
    const skipped = [];
    for (const f of list) {
      if (!/^image\//.test(f.type) && f.type !== "application/pdf") { skipped.push(`${f.name} (not an image or PDF)`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { skipped.push(`${f.name} (over ${MAX_MB} MB)`); continue; }
      if (files[kind].length >= MAX_FILES) { skipped.push(`${f.name} (max ${MAX_FILES} files)`); continue; }
      files[kind].push(f);
    }
    renderThumbs(kind);
    if (skipped.length) alert("Some files weren't added:\n" + skipped.join("\n"));
  }

  function renderThumbs(kind) {
    const box = $(`[data-thumbs="${kind}"]`);
    $$("img", box).forEach((img) => URL.revokeObjectURL(img.src));
    box.innerHTML = "";
    files[kind].forEach((f, i) => {
      const fig = document.createElement("figure");
      fig.innerHTML = f.type === "application/pdf"
        ? `<div class="pdf">PDF</div>`
        : `<img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">`;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `Remove ${f.name}`);
      rm.onclick = () => { files[kind].splice(i, 1); renderThumbs(kind); };
      fig.appendChild(rm);
      box.appendChild(fig);
    });
  }

  $$("[data-files]").forEach((input) => {
    input.addEventListener("change", () => { addFiles(input.dataset.files, input.files); input.value = ""; });
  });
  $$("[data-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("drag"); addFiles(zone.dataset.drop, e.dataTransfer.files); });
  });

  // ---------- Calendar ----------
  const cal = { picks: [], blocked: new Set(), loaded: new Set() };
  const minDate = new Date(today); minDate.setDate(minDate.getDate() + cfg.minNoticeDays);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + cfg.bookingWindowDays);
  const firstMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const lastMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  let view = new Date(firstMonth);
  const RANKS = ["1st choice", "2nd choice", "3rd choice"];
  const calStatus = $("#cal-status");

  const isOpen = (d) => d >= minDate && d <= maxDate && cfg.workDays.includes(d.getDay()) && !cal.blocked.has(iso(d));

  function renderCal() {
    $("#cal-month").textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    $("#cal-prev").disabled = view <= firstMonth;
    $("#cal-next").disabled = view >= lastMonth;

    const grid = $("#cal-grid");
    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="cal-dow">${d}</div>`).join("");
    for (let i = 0; i < view.getDay(); i++) html += `<span class="cal-day blank"></span>`;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= days; n++) {
      const d = new Date(view.getFullYear(), view.getMonth(), n);
      const key = iso(d);
      const rank = cal.picks.indexOf(key);
      const open = isOpen(d);
      const cls = ["cal-day", rank > -1 ? "picked" : "", +d === +today ? "today" : ""].join(" ");
      const label = `${pretty(key)}${rank > -1 ? ", " + RANKS[rank] : open ? "" : ", unavailable"}`;
      html += `<button type="button" class="${cls}" data-date="${key}" aria-label="${label}" aria-pressed="${rank > -1}" ${open ? "" : "disabled"}>${n}${rank > -1 ? `<span class="rank">${rank + 1}</span>` : ""}</button>`;
    }
    grid.innerHTML = html;
    loadMonth(view);
  }

  function renderPicks() {
    $("#picks").innerHTML = RANKS.map((r, i) => {
      const p = cal.picks[i];
      return p
        ? `<li><span><span class="tagnum">${i + 1}</span>${esc(pretty(p))}</span><button type="button" data-unpick="${p}" aria-label="Remove ${esc(pretty(p))}">×</button></li>`
        : `<li class="empty"><span><span class="tagnum">${i + 1}</span>${r}${i === 0 ? "" : " (optional)"}</span></li>`;
    }).join("");
  }

  function togglePick(key) {
    const i = cal.picks.indexOf(key);
    if (i > -1) cal.picks.splice(i, 1);
    else if (cal.picks.length >= 3) { calStatus.textContent = "You've got 3 picks. Tap one to remove it first."; return; }
    else cal.picks.push(key);
    calStatus.textContent = "";
    $("#calendar").closest(".cal-wrap").classList.remove("invalid");
    $("#calendar").style.borderColor = "";
    hideErrors();
    renderCal(); renderPicks(); saveDraft();
  }

  $("#cal-grid").addEventListener("click", (e) => { const b = e.target.closest("[data-date]"); if (b && !b.disabled) togglePick(b.dataset.date); });
  $("#picks").addEventListener("click", (e) => { const b = e.target.closest("[data-unpick]"); if (b) togglePick(b.dataset.unpick); });
  $("#cal-prev").onclick = () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); };
  $("#cal-next").onclick = () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); };

  // Google Calendar hook: see availabilityUrl in config.js
  function loadMonth(d) {
    if (!cfg.availabilityUrl) return;
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (cal.loaded.has(key)) return;
    cal.loaded.add(key);
    calStatus.textContent = "Checking Ben's calendar...";
    fetch(`${cfg.availabilityUrl}?month=${key}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        (j.blocked || []).forEach((b) => cal.blocked.add(b));
        cal.picks = cal.picks.filter((p) => !cal.blocked.has(p));
        calStatus.textContent = "";
        renderCal(); renderPicks();
      })
      .catch(() => { calStatus.textContent = "Couldn't reach Ben's calendar. Pick any open day and he'll confirm."; });
  }

  // ---------- Signature pad ----------
  const canvas = $("#sig-canvas");
  const ctx = canvas.getContext("2d");
  let sigInk = false;
  let drawing = false;
  let last = null;

  function paintBlank() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width === Math.round(r.width * dpr)) return;
    const prev = sigInk ? canvas.toDataURL() : null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    paintBlank();
    if (prev) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = prev; }
  }
  const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    drawing = true; last = pt(e);
    ctx.beginPath(); ctx.arc(last.x, last.y, 1.3, 0, Math.PI * 2); ctx.fillStyle = "#111"; ctx.fill();
    sigInk = true; $("#sig-pad").classList.remove("invalid");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pt(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => canvas.addEventListener(ev, () => (drawing = false)));
  $("#sig-clear").onclick = () => { sigInk = false; paintBlank(); };
  let rz;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(sizeCanvas, 150); });

  // ---------- Collect answers ----------
  function collectStep(i) {
    const s = steps[i];
    const items = [];
    const seen = new Set();
    $$("[name]", s).forEach((el) => {
      if (el.type === "file" || seen.has(el.name) || el.closest("[hidden]")) return;
      seen.add(el.name);
      const label = el.dataset.label || el.closest("[data-label]")?.dataset.label || el.name;
      const value = el.type === "checkbox" || el.type === "radio"
        ? $$(`[name="${el.name}"]`, s).filter((x) => x.checked).map((x) => x.value).join(", ")
        : el.value.trim();
      items.push({ name: el.name, label, value });
    });

    if (i === 1 && cfg.allowUploads) {
      items.push({ name: "areaCount", label: "Photos of the Area", value: fileSummary(files.area) });
      items.push({ name: "refCount", label: "Reference Images", value: fileSummary(files.ref) });
    }
    if (i === 2) {
      const picks = cal.picks.map((p, k) => ({ name: `pick${k + 1}`, label: RANKS[k], value: pretty(p) }));
      items.unshift(...picks, { name: "datesISO", label: "Requested Dates (ISO)", value: cal.picks.join(", ") });
    }
    if (i === 3) items.push({ name: "signature", label: "Drawn Signature", value: sigInk ? "Signed (see signature image)" : "" });
    return items;
  }
  const fileSummary = (list) => (list.length ? `${list.length} file(s): ${list.map((f) => f.name).join(", ")}` : "None");
  const collectAll = () => steps.slice(0, 4).map((s, i) => ({ title: s.dataset.title, step: i, items: collectStep(i) }));

  // ---------- Validation ----------
  function labelOf(el) {
    return el.dataset.label || el.closest("[data-label]")?.dataset.label || el.name;
  }

  function validate(i) {
    const s = steps[i];
    const errs = [];
    let firstBad = null;
    $$(".invalid", s).forEach((x) => x.classList.remove("invalid"));
    const fail = (el, msg) => {
      errs.push(msg);
      (el.closest(".yn, fieldset, .field") || el).classList.add("invalid");
      firstBad = firstBad || el;
    };

    $$("input[required], select[required], textarea[required]", s).forEach((el) => {
      if (!el.closest("[hidden]") && !el.value.trim()) fail(el, `${labelOf(el)} is required.`);
    });
    $$("[data-required-group]", s).forEach((fs) => {
      if (!$$("input", fs).some((x) => x.checked)) fail(fs, fs.dataset.msg || `${fs.dataset.label}: pick one.`);
    });

    if (i === 0) {
      const email = val("email");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail($("#email"), "That email address doesn't look right.");
      const phone = val("phone").replace(/\D/g, "");
      if (val("phone") && (phone.length < 10 || phone.length > 15)) fail($("#phone"), "Phone number needs at least 10 digits.");
      const zip = val("zip");
      if (zip && !/^\d{5}(-?\d{4})?$/.test(zip)) fail($("#zip"), "Zip code should be 5 digits.");
      const age = ageFrom(val("dob"));
      if (val("dob") && (age === null || age < 0 || age > 120)) fail($("#dob"), "Double-check your date of birth.");
      else if (age !== null && age < 18) fail($("#dob"), "You must be 18 or older to book.");
    }

    if (i === 2 && !cal.picks.length) {
      $("#calendar").style.borderColor = "var(--danger)";
      errs.push("Pick at least one day on the calendar.");
      firstBad = firstBad || $("#calendar");
    }

    if (i === 3) {
      YN.forEach(([k, q]) => { if (!ynVal(k)) fail($(`[name="yn_${k}"]`), `Answer: "${q}"`); });
      if (ynVal("over18") === "No") fail($('[name="yn_over18"]'), "You must be 18 or older to be tattooed.");
      const acks = $$("[data-ack]");
      if (acks.some((a) => !a.checked)) fail(acks.find((a) => !a.checked), "Check all five acknowledgment boxes.");
      if (!sigInk) { $("#sig-pad").classList.add("invalid"); errs.push("Sign in the signature box."); firstBad = firstBad || canvas; }
    }

    if (errs.length) {
      errorsBox.innerHTML = `<strong>Fix these and try again:</strong><ul>${errs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`;
      errorsBox.classList.add("show");
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      if (firstBad.focus) firstBad.focus({ preventScroll: true });
      return false;
    }
    hideErrors();
    return true;
  }
  const hideErrors = () => { errorsBox.classList.remove("show"); errorsBox.innerHTML = ""; };

  // Once the client starts fixing things, clear the error box; Next re-checks.
  form.addEventListener("input", (e) => { e.target.closest?.(".invalid")?.classList.remove("invalid"); hideErrors(); });
  form.addEventListener("change", (e) => { e.target.closest?.(".invalid")?.classList.remove("invalid"); hideErrors(); });

  // ---------- Step navigation ----------
  function show(i) {
    current = i;
    steps.forEach((s, k) => s.classList.toggle("active", k === i));
    progress.forEach((li, k) => { li.classList.toggle("active", k === i); li.classList.toggle("done", k < i); });
    backBtn.hidden = i === 0;
    nextBtn.hidden = i === steps.length - 1;
    submitBtn.hidden = i !== steps.length - 1;
    hideErrors();

    if (i === 3) {
      fillWho();
      if (!val("sigName")) $("#sigName").value = `${val("firstName")} ${val("lastName")}`.trim();
      sizeCanvas();
    }
    if (i === 4) renderReview();

    $("#progress").scrollIntoView({ behavior: "smooth", block: "start" });
    $("h2", steps[i]).focus({ preventScroll: true });
  }

  nextBtn.onclick = () => { if (validate(current)) show(current + 1); };
  backBtn.onclick = () => show(current - 1);

  function fillWho() {
    const rows = [
      ["Name", `${val("firstName")} ${val("lastName")}`],
      ["Address", val("address")],
      ["City / State / Zip", `${val("city")}, ${val("state")} ${val("zip")}`],
      ["Date of Birth", val("dob") ? pretty(val("dob")) : ""],
      ["Age", val("age")],
      ["Email", val("email")],
      ["Phone", val("phone")],
    ];
    $("#who").innerHTML = rows.map(([k, v]) => `<div>${esc(k)}: <b>${esc(v)}</b></div>`).join("");
  }

  function renderReview() {
    const sections = collectAll();
    $("#review").innerHTML = sections.map((sec) => `
      <div class="review-block">
        <h3>${esc(sec.title)} <button type="button" data-goto="${sec.step}">EDIT</button></h3>
        <dl>${sec.items.filter((it) => it.value && it.name !== "datesISO" && it.name !== "signature")
          .map((it) => `<dt>${esc(it.label)}</dt><dd>${esc(it.value)}</dd>`).join("")}
          ${sec.step === 3 ? `<dt>Signature</dt><dd><img class="sig" src="${canvas.toDataURL()}" alt="Your signature"></dd>` : ""}
        </dl>
      </div>`).join("");
  }
  $("#review").addEventListener("click", (e) => { const b = e.target.closest("[data-goto]"); if (b) show(+b.dataset.goto); });

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (let i = 0; i < 4; i++) {
      if (!validate(i)) { show(i); validate(i); return; }
    }
    const label = $("span", submitBtn);
    submitBtn.disabled = true;
    label.textContent = "SENDING...";
    const sections = collectAll();
    const name = `${val("firstName")} ${val("lastName")}`;

    try {
      if (cfg.formEndpoint) {
        await sendToEndpoint(sections, name);
        finish(`Thanks, ${val("firstName")}! Your request is in. Ben will look it over and reach out by ${($('[name="contactPref"]:checked')?.value || "email").toLowerCase()} to confirm your date and deposit.`);
      } else {
        sendByEmailApp(sections, name);
        finish(`Your email app should open with everything filled in. Hit send to get it to Ben${cfg.allowUploads ? ", and attach your photos to that email" : ""}.`);
      }
    } catch (err) {
      errorsBox.innerHTML = `<strong>That didn't go through.</strong><ul><li>${esc(err.message || err)}</li><li>Check your connection and try again, or email Ben at <a href="mailto:${esc(cfg.bookingEmail)}">${esc(cfg.bookingEmail)}</a>.</li></ul>`;
      errorsBox.classList.add("show");
    } finally {
      submitBtn.disabled = false;
      label.textContent = "SUBMIT TO BEN";
    }
  });

  async function sendToEndpoint(sections, name) {
    const fd = new FormData();
    fd.append("_subject", `VTS INK booking request: ${name}`);
    fd.append("email", val("email")); // reply-to
    sections.forEach((sec) => sec.items.forEach((it) => {
      if (it.value && it.name !== "email") fd.append(`${sec.title} | ${it.label}`, it.value);
    }));
    if (cfg.allowUploads) {
      files.area.forEach((f, i) => fd.append(`area_photo_${i + 1}`, f, f.name));
      files.ref.forEach((f, i) => fd.append(`reference_${i + 1}`, f, f.name));
      fd.append("signature", signatureBlob(), `signature-${name.replace(/\s+/g, "-")}.png`);
    } else {
      fd.append("Signature (image data)", canvas.toDataURL("image/png"));
    }

    const res = await fetch(cfg.formEndpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
    if (!res.ok) {
      let msg = `The server answered with error ${res.status}.`;
      try { const j = await res.json(); if (j.errors) msg = j.errors.map((x) => x.message).join("; "); } catch (_) { /* keep default */ }
      throw new Error(msg);
    }
  }

  function signatureBlob() {
    const bin = atob(canvas.toDataURL("image/png").split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "image/png" });
  }

  function sendByEmailApp(sections, name) {
    const body = sections.map((sec) =>
      `== ${sec.title.toUpperCase()} ==\n` +
      sec.items.filter((it) => it.value).map((it) => `${it.label}: ${it.value}`).join("\n")
    ).join("\n\n") + "\n\n(Sent from the VTS INK booking page)";
    const subject = `VTS INK booking request: ${name}`;
    window.location.href = `mailto:${cfg.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function finish(msg) {
    steps.forEach((s) => s.classList.remove("active"));
    progress.forEach((li) => { li.classList.remove("active"); li.classList.add("done"); });
    $("#success-msg").textContent = msg;
    $("#success").classList.add("active");
    $("#step-nav").hidden = true;
    $("#draft-note").hidden = true;
    clearDraft();
    $("#progress").scrollIntoView({ behavior: "smooth", block: "start" });
    $("h2", $("#success")).focus({ preventScroll: true });
  }

  // ---------- Draft autosave (this device only) ----------
  let saveT;
  function saveDraft() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const data = { _picks: cal.picks };
      $$("[name]", form).forEach((el) => {
        if (el.type === "file" || el.readOnly) return;
        if (el.type === "checkbox" || el.type === "radio") {
          data[el.name] = data[el.name] || [];
          if (el.checked) data[el.name].push(el.value);
        } else data[el.name] = el.value;
      });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) { /* storage unavailable */ }
    }, 300);
  }
  function loadDraft() {
    let data;
    try { data = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (_) { return; }
    if (!data) return;
    $$("[name]", form).forEach((el) => {
      if (!(el.name in data) || el.type === "file" || el.readOnly) return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = data[el.name].includes(el.value);
      else el.value = data[el.name];
    });
    cal.picks = (data._picks || []).filter((p) => isOpen(parseISO(p))).slice(0, 3);
    syncAge();
    syncWaiverRules();
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ } }

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);
  $("#reset-btn").onclick = () => {
    if (confirm("Clear everything and start over?")) { clearDraft(); location.reload(); }
  };

  // ---------- Go ----------
  loadDraft();
  if (cal.picks.length) view = new Date(parseISO(cal.picks[0]).getFullYear(), parseISO(cal.picks[0]).getMonth(), 1);
  renderCal();
  renderPicks();
})();
