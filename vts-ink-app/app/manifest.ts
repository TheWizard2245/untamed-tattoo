import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VTS INK — Book with Ben",
    short_name: "VTS INK",
    description: "Custom tattoos by Ben. Browse the work and book your session.",
    start_url: "/",
    display: "standalone",
    background_color: "#060807",
    theme_color: "#060807",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
