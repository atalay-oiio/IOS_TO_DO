import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ACCENT_ALIASES, accentCss } from "@/lib/paint";
import "./globals.css";
import "./overlays.css";

// SF Pro yalnızca Apple cihazlarda var; Android/Windows'ta en yakın karşılık Inter
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Glass Todo",
  description: "iOS 27 liquid glass tarzında modern yapılacaklar listesi",
  appleWebApp: {
    capable: true,
    title: "Todo",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Tema ve vurgu rengini ilk boyamadan önce uygula (açılışta yanıp sönmeyi önler).
// Renk değerleri accentCss()'te; betik yalnızca seçili rengi <html data-accent>'e, cam ayarını data-glass'a yazar.
const themeScript = `(function(){try{
var s=JSON.parse(localStorage.getItem('glass-todo:settings')||'{}');
var t=s.theme||'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;r.dataset.theme=d?'dark':'light';
var a=s.accent;if(typeof a==='string'&&a)r.dataset.accent=${JSON.stringify(ACCENT_ALIASES)}[a.toLowerCase()]||a;
var g=matchMedia('(prefers-reduced-transparency: reduce)').matches?4:s.glass;if(typeof g==='number')r.dataset.glass=g;
var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',d?'#07070f':'#eef0f8');
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#07070f" />
        <style dangerouslySetInnerHTML={{ __html: accentCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="bg" aria-hidden>
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
          <span className="blob b4" />
        </div>
        {children}
      </body>
    </html>
  );
}
