"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

export type SignatureHandle = { toDataURL: () => string; clear: () => void };

// Finger / mouse signature on a white canvas. Calls onInk(true) once the
// client draws, onInk(false) when cleared.
const SignaturePad = forwardRef<SignatureHandle, { onInk: (has: boolean) => void; invalid?: boolean; active?: boolean }>(
  function SignaturePad({ onInk, invalid, active }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const hasInk = useRef(false);

    const ctx = () => canvas.current!.getContext("2d")!;

    const paintBlank = useCallback(() => {
      const c = canvas.current!;
      const g = ctx();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.restore();
    }, []);

    const size = useCallback(() => {
      const c = canvas.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width === Math.round(r.width * dpr)) return;
      const prev = hasInk.current ? c.toDataURL() : null;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const g = ctx();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineWidth = 2.6;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#111";
      paintBlank();
      if (prev) {
        const img = new Image();
        img.onload = () => g.drawImage(img, 0, 0, r.width, r.height);
        img.src = prev;
      }
    }, [paintBlank]);

    useEffect(() => {
      size();
      let t: ReturnType<typeof setTimeout>;
      const onResize = () => { clearTimeout(t); t = setTimeout(size, 150); };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [size]);

    // The pad is measured when its step becomes visible (hidden steps have no size)
    useEffect(() => { if (active) size(); }, [active, size]);

    useImperativeHandle(ref, () => ({
      toDataURL: () => canvas.current!.toDataURL("image/png"),
      clear: () => { hasInk.current = false; paintBlank(); onInk(false); },
    }), [paintBlank, onInk]);

    const pt = (e: React.PointerEvent) => {
      const r = canvas.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    return (
      <div className={`sig-pad${invalid ? " invalid" : ""}`}>
        <canvas
          ref={canvas}
          aria-label="Signature pad"
          onPointerDown={(e) => {
            e.preventDefault();
            canvas.current!.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = pt(e);
            const g = ctx();
            g.beginPath();
            g.arc(last.current.x, last.current.y, 1.3, 0, Math.PI * 2);
            g.fillStyle = "#111";
            g.fill();
            if (!hasInk.current) { hasInk.current = true; onInk(true); }
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const p = pt(e);
            const g = ctx();
            g.beginPath();
            g.moveTo(last.current.x, last.current.y);
            g.lineTo(p.x, p.y);
            g.stroke();
            last.current = p;
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
        <span className="x" aria-hidden="true">&times;</span>
        <span className="line" aria-hidden="true" />
        <button type="button" className="clear" onClick={() => { hasInk.current = false; paintBlank(); onInk(false); }}>CLEAR</button>
      </div>
    );
  },
);

export default SignaturePad;
