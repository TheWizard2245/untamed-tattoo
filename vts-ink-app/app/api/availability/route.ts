// GET /api/availability?month=YYYY-MM → { blocked: ["YYYY-MM-DD", ...] }
// Hook for Ben's Google Calendar. Until AVAILABILITY_SOURCE_URL is set, no
// extra days are blocked (work days / notice rules still apply in the app).
import { NextResponse } from "next/server";
import { isISODate } from "@/lib/dates";

export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });

  const source = process.env.AVAILABILITY_SOURCE_URL;
  if (!source) return NextResponse.json({ blocked: [] });

  try {
    const res = await fetch(`${source}?month=${month}`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { blocked?: unknown };
    const blocked = Array.isArray(j.blocked) ? j.blocked.filter((d): d is string => typeof d === "string" && isISODate(d) && d.startsWith(month)) : [];
    return NextResponse.json({ blocked });
  } catch (e) {
    console.error("[availability]", e);
    return NextResponse.json({ error: "calendar unavailable" }, { status: 502 });
  }
}
