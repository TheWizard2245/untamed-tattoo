"use client";

import { useEffect, useMemo, useState } from "react";
import { bookableRange, isBookable } from "@/lib/booking";
import { iso, monthKey, parseISO, pretty, startOfToday } from "@/lib/dates";

const RANKS = ["1st choice", "2nd choice", "3rd choice"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ picks, onChange, invalid }: {
  picks: string[]; onChange: (p: string[]) => void; invalid?: boolean;
}) {
  const today = useMemo(startOfToday, []);
  const { min, max } = useMemo(() => bookableRange(today), [today]);
  const firstMonth = new Date(min.getFullYear(), min.getMonth(), 1);
  const lastMonth = new Date(max.getFullYear(), max.getMonth(), 1);
  const [view, setView] = useState(() => (picks[0] ? new Date(parseISO(picks[0]).getFullYear(), parseISO(picks[0]).getMonth(), 1) : firstMonth));
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");

  // Busy days from Ben's calendar (see app/api/availability)
  useEffect(() => {
    const key = monthKey(view);
    if (loaded.has(key)) return;
    setLoaded((s) => new Set(s).add(key));
    let cancelled = false;
    fetch(`/api/availability?month=${key}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { blocked?: string[] }) => {
        if (cancelled || !j.blocked?.length) return;
        setBlocked((b) => {
          const n = new Set(b);
          j.blocked!.forEach((d) => n.add(d));
          return n;
        });
      })
      .catch(() => !cancelled && setStatus("Couldn't reach Ben's calendar. Pick any open day and he'll confirm."));
    return () => { cancelled = true; };
  }, [view, loaded]);

  // Drop picks that turn out to be blocked
  useEffect(() => {
    const still = picks.filter((p) => !blocked.has(p));
    if (still.length !== picks.length) onChange(still);
  }, [blocked, picks, onChange]);

  function toggle(day: string) {
    if (picks.includes(day)) { onChange(picks.filter((p) => p !== day)); setStatus(""); return; }
    if (picks.length >= 3) { setStatus("You've got 3 picks. Tap one to remove it first."); return; }
    setStatus("");
    onChange([...picks, day]);
  }

  const lead = view.getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const move = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));

  return (
    <div className="cal-wrap">
      <div className="calendar" style={invalid ? { borderColor: "var(--danger)" } : undefined}>
        <div className="cal-head">
          <button type="button" className="cal-nav" aria-label="Previous month" disabled={view <= firstMonth} onClick={() => move(-1)}>&lsaquo;</button>
          <h3 aria-live="polite">{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
          <button type="button" className="cal-nav" aria-label="Next month" disabled={view >= lastMonth} onClick={() => move(1)}>&rsaquo;</button>
        </div>
        <div className="cal-grid">
          {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {Array.from({ length: lead }, (_, i) => <span className="cal-day blank" key={`b${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const d = new Date(view.getFullYear(), view.getMonth(), i + 1);
            const key = iso(d);
            const rank = picks.indexOf(key);
            const open = isBookable(key, blocked, today);
            const cls = ["cal-day", rank > -1 && "picked", +d === +today && "today"].filter(Boolean).join(" ");
            return (
              <button
                key={key}
                type="button"
                className={cls}
                disabled={!open && rank === -1}
                aria-pressed={rank > -1}
                aria-label={`${pretty(key)}${rank > -1 ? `, ${RANKS[rank]}` : open ? "" : ", unavailable"}`}
                onClick={() => toggle(key)}
              >
                {i + 1}
                {rank > -1 && <span className="rank">{rank + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="cal-legend">
          <span><i style={{ background: "#18201d", border: "1px solid #3a4440" }} />Open</span>
          <span><i style={{ background: "var(--lime)" }} />Your pick</span>
          <span><i style={{ border: "1px solid #252b29" }} />Unavailable</span>
        </div>
        <div className="cal-status" aria-live="polite">{status}</div>
      </div>

      <div>
        <span className="label req">Your Picks</span>
        <ul className="picks">
          {RANKS.map((r, i) => {
            const p = picks[i];
            return p ? (
              <li key={r}>
                <span><span className="tagnum">{i + 1}</span>{pretty(p)}</span>
                <button type="button" aria-label={`Remove ${pretty(p)}`} onClick={() => toggle(p)}>×</button>
              </li>
            ) : (
              <li key={r} className="empty"><span><span className="tagnum">{i + 1}</span>{r}{i ? " (optional)" : ""}</span></li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
