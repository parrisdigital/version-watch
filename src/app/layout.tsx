import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@/styles/globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Version Watch — developer change intelligence",
    template: "%s · Version Watch",
  },
  description:
    "Version Watch ingests every major developer platform's official changelog, scores what actually matters, and publishes a source-linked public feed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <script src="/theme-init.js" async={false} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
