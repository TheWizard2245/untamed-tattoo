import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/config";

export default function Home() {
  return (
    <>
      {/* Logo centerpiece */}
      <section className="hero">
        <svg className="hud-ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="96" className="r1" />
          <circle cx="100" cy="100" r="88" className="r2" />
          <circle cx="100" cy="100" r="80" className="r3" />
        </svg>
        <div className="hud-label l1" aria-hidden="true">VTS//INK &mdash; CUSTOM TATTOO</div>
        <figure className="logo-frame">
          <Image src="/images/logo.jpg" alt="Vachon Custom Tattoo Shop logo" width={1391} height={1800} priority sizes="(max-width: 760px) 82vw, 700px" />
          <span className="scan" aria-hidden="true" />
        </figure>
        <div className="hud-label l2" aria-hidden="true">
          <i /> ONLINE &middot; BELLINGHAM, MA
        </div>
        <a className="scroll-cue" href="#artist">Meet the artist</a>
      </section>

      <div className="divider" aria-hidden="true" />

      {/* Artist + portfolio link */}
      <section className="artist" id="artist">
        <div className="artist-inner">
          <figure className="sticker">
            <span className="label">ARTIST // 01</span>
            <Image src="/images/ben.jpg" alt="Ben, tattoo artist at VTS INK" width={750} height={1000} sizes="(max-width: 760px) 340px, 400px" />
            <figcaption>BEN</figcaption>
          </figure>
          <div className="artist-copy">
            <h2>BEN</h2>
            <p className="kicker">VTS INK &middot; CUSTOM TATTOOS</p>
            <a className="shop-loc" href={site.mapUrl} target="_blank" rel="noopener">
              <span className="pin" aria-hidden="true">&#9673;</span>
              <span>
                Tattooing out of <b>{site.studio}</b>
                <br />
                {site.address}
              </span>
            </a>
            <p>Every piece is drawn for you and only you. Have a look through the work, then lock in your spot.</p>
            <Link className="btn btn-ghost" href="/portfolio">
              <span>VIEW PORTFOLIO &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="book-cta">
        <p className="pre">Ready to get tattooed?</p>
        <Link className="btn btn-mega" href="/book">
          <span>BOOK YOUR SESSION NOW!</span>
        </Link>
        <div className="steps-hint" aria-label="Booking steps">
          <span><b>01</b> Your info</span>
          <span><b>02</b> Your idea</span>
          <span><b>03</b> Pick a date</span>
          <span><b>04</b> Waiver</span>
        </div>
      </section>
    </>
  );
}
