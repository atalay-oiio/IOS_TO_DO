import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glass Todo",
    short_name: "Todo",
    description: "iOS 26 liquid glass tarzında yapılacaklar listesi",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b1a",
    theme_color: "#0b0b1a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
