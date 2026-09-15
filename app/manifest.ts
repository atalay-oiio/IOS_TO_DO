import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Glass Todo",
    short_name: "Todo",
    description: "iOS 26 liquid glass tarzında yapılacaklar listesi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "tr",
    categories: ["productivity"],
    background_color: "#07070f",
    theme_color: "#07070f",
    icons: [
      { src: "/pwa/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    // Android'de ikona basılı tutunca çıkan kısayol
    shortcuts: [
      { name: "Yeni görev", short_name: "Yeni", url: "/?new=1", icons: [{ src: "/pwa/192", sizes: "192x192" }] },
    ],
  };
}
