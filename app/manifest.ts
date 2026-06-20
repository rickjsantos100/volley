import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voley Lisboa",
    short_name: "Voley",
    description: "Organiza e participa nos jogos do Voley Lisboa.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fff8d8",
    theme_color: "#061b6b",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
