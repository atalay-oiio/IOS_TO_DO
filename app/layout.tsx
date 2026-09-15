import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./overlays.css";

// SF Pro yalnızca Apple cihazlarda var; Android/Windows'ta en yakın karşılık Inter
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Glass Todo",
  description: "iOS 26 liquid glass tarzında modern yapılacaklar listesi",
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

// Tema ve vurgu rengini ilk boyamadan önce uygula (açılışta yanıp sönmeyi önler)
const themeScript = `(function(){try{
var s=JSON.parse(localStorage.getItem('glass-todo:settings')||'{}');
var t=s.theme||'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;r.dataset.theme=d?'dark':'light';
var c=s.accent;
if(typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c)){var l='color-mix(in srgb, '+c+' 60%, white)';
r.style.setProperty('--accent',c);r.style.setProperty('--accent-grad','linear-gradient(135deg, '+l+', '+c+')');
r.style.setProperty('--ring-1',l);r.style.setProperty('--ring-2',c);r.style.setProperty('--ring-3',c);}
var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',d?'#07070f':'#eef0f8');
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#07070f" />
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
