import type { Metadata, Viewport } from "next";
import { Exo_2, Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import Topbar from "@/components/Topbar";
import Footer from "@/components/Footer";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });
const exo = Exo_2({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-exo" });
const mono = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono-tech" });

export const metadata: Metadata = {
  title: { default: "VTS INK | Custom Tattoos by Ben", template: "%s | VTS INK" },
  description: "Custom tattoos by Ben at VTS INK, Untamed Tattoo & Piercing, Bellingham MA. View the portfolio and book your session.",
  applicationName: "VTS INK",
  appleWebApp: { capable: true, title: "VTS INK", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#060807",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${exo.variable} ${mono.variable}`}>
      <body>
        <div className="underlay" aria-hidden="true" />
        <Topbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
