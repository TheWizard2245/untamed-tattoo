import { site } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="footer">
      <span className="brand-tag">
        VTS<span>//</span>INK
      </span>
      <p className="footer-shop">
        Tattooing out of {site.studio}
        <br />
        <a href={site.mapUrl} target="_blank" rel="noopener">
          {site.address}
        </a>
      </p>
      <div>
        &copy; {new Date().getFullYear()} {site.brand}
        {site.instagram && (
          <>
            {" "}&middot;{" "}
            <a href={site.instagram} target="_blank" rel="noopener">
              Instagram
            </a>
          </>
        )}
      </div>
    </footer>
  );
}
