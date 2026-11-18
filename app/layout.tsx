import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "./_components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("ogami-theme");if(s==="light"||s==="dark"){document.documentElement.dataset.theme=s;}else{var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Ogami — Code-First OG Image Toolkit for Next.js",
    template: "%s | Ogami",
  },
  description:
    "A Next.js-first, code-first, installable OG template registry with guardrails so cards cannot look broken (including script safety), and ready-made developer milestone cards.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
