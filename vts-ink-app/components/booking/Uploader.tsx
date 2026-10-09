"use client";

import { useState, type ReactNode } from "react";
import { site } from "@/lib/config";
import { prepareUpload, type UploadItem } from "@/lib/images";

export default function Uploader({ label, hint, cta, items, onChange }: {
  label: string; hint: ReactNode; cta: string; items: UploadItem[]; onChange: (items: UploadItem[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const next = [...items];
    const issues: string[] = [];
    for (const f of Array.from(list)) {
      if (next.length >= site.maxFilesPerGroup) { issues.push(`${f.name}: max ${site.maxFilesPerGroup} files`); continue; }
      try { next.push(await prepareUpload(f, site.uploadMaxEdge)); }
      catch (e) { issues.push((e as Error).message); }
    }
    setProblems(issues);
    onChange(next);
    setBusy(false);
  }

  function remove(id: string) {
    const gone = items.find((i) => i.id === id);
    if (gone?.url) URL.revokeObjectURL(gone.url);
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <span className="hint">{hint}</span>
      <label
        className={`upload${drag ? " drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
      >
        <input type="file" accept="image/*,.pdf" multiple onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        <span className="big">{busy ? "PROCESSING..." : `+ ${cta}`}</span>
        <br />
        <span className="small">Tap to choose or drag them here &middot; JPG, PNG or PDF</span>
      </label>
      {problems.length > 0 && <span className="hint" style={{ color: "#ffb8c0", marginTop: 8 }}>Not added: {problems.join("; ")}</span>}
      {items.length > 0 && (
        <div className="thumbs">
          {items.map((it) => (
            <figure key={it.id}>
              {it.isPdf ? <div className="pdf">PDF</div> : <img src={it.url} alt={it.name} />}
              <button type="button" aria-label={`Remove ${it.name}`} onClick={() => remove(it.id)}>×</button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
