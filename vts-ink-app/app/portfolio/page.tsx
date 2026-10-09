import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Gallery from "@/components/Gallery";

export const metadata: Metadata = { title: "Portfolio" };

// Every image in public/images/portfolio shows up here (thumbnail of the same
// name in public/images/thumbs). Add or remove photos, then rebuild.
async function listPieces() {
  const dir = path.join(process.cwd(), "public", "images", "portfolio");
  const files = await readdir(dir);
  return files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
}

export default async function PortfolioPage() {
  const pieces = await listPieces();
  return (
    <>
      <header className="page-head">
        <h1>The Work</h1>
        <p>Tap any piece to see it full size.</p>
      </header>

      <Gallery pieces={pieces} />

      <div className="portfolio-cta">
        <Link className="btn btn-mega" href="/book">
          <span>BOOK YOUR SESSION NOW!</span>
        </Link>
      </div>
    </>
  );
}
