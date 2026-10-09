"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/book", label: "Book" },
];

export default function Topbar() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link className="brand-tag" href="/">
        VTS<span>//</span>INK
      </Link>
      <nav>
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
