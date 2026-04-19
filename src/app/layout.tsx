import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Version Watch",
  description: "Change intelligence for developers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${geistMono.variable} bg-zinc-950 font-sans text-zinc-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
