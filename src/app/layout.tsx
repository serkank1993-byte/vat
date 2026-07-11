import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAT — Video Analysis Tactics",
  description: "Football match and video tactical analysis tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-5xl flex gap-6 px-6 py-4 text-sm font-medium">
            <Link href="/" className="hover:underline">
              VAT
            </Link>
            <Link href="/teams" className="hover:underline">
              Teams
            </Link>
            <Link href="/players" className="hover:underline">
              Players
            </Link>
            <Link href="/matches" className="hover:underline">
              Matches
            </Link>
            <Link href="/live" className="hover:underline">
              Live
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          </div>
        </nav>
        <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
