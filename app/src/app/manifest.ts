import type { MetadataRoute } from "next";

// Lets readers add BX News to their phone's home screen (Blueprint: mobile-first).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BEMERICK EXPRESS · BX News",
    short_name: "BX News",
    description: "Fast, verified, mobile-first news from Uganda.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#0E3B43",
    lang: "en-UG",
    categories: ["news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
