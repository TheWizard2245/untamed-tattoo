"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function Gallery({ pieces }: { pieces: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const count = pieces.length;

  const show = useCallback((i: number) => setOpen(((i % count) + count) % count), [count]);
  const close = useCallback(() => {
    setOpen(null);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(open - 1);
      if (e.key === "ArrowRight") show(open + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, show, close]);

  return (
    <>
      <div className="gallery">
        {pieces.map((file, i) => (
          <button
            key={file}
            type="button"
            aria-label={`View tattoo ${i + 1} of ${count}`}
            onClick={(e) => {
              lastFocus.current = e.currentTarget;
              setOpen(i);
            }}
          >
            {/* Plain img: masonry needs each photo's natural height */}
            <img src={`/images/thumbs/${file}`} alt={`Tattoo by Ben, piece ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="lightbox open"
          role="dialog"
          aria-modal="true"
          aria-label="Tattoo photo viewer"
          onClick={(e) => e.target === e.currentTarget && close()}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) show(open + (dx < 0 ? 1 : -1));
            touchX.current = null;
          }}
        >
          <img src={`/images/portfolio/${pieces[open]}`} alt={`Tattoo by Ben, piece ${open + 1}`} />
          <button ref={closeBtn} className="lb-btn lb-close" aria-label="Close" onClick={close}>&times;</button>
          <button className="lb-btn lb-prev" aria-label="Previous" onClick={() => show(open - 1)}>&larr;</button>
          <button className="lb-btn lb-next" aria-label="Next" onClick={() => show(open + 1)}>&rarr;</button>
          <div className="lb-count">{open + 1} / {count}</div>
        </div>
      )}
    </>
  );
}
