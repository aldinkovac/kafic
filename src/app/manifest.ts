import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kafić",
    short_name: "Kafić",
    description: "Diskretno mjesto za upoznavanje za naše ljude u BiH i dijaspori.",
    start_url: "/kafic",
    display: "standalone",
    background_color: "#1f120a",
    theme_color: "#b45309",
    lang: "bs",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
