import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glass Todo",
    short_name: "Todo",
    description: "iOS 26 liquid glass tarzında yapılacaklar listesi",
    start_url: "/",
    display: "standalone",
    background_color: "#07070f",
    theme_color: "#07070f",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
