"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

const LINKS = [
  { href: "/teams", label: "Takımlar" },
  { href: "/players", label: "Oyuncular" },
  { href: "/matches", label: "Maçlar" },
  { href: "/live", label: "Canlı Takip" },
  { href: "/analysis", label: "Video Analiz" },
  { href: "/dashboard", label: "İstatistikler" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { session } = useSession();

  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto max-w-5xl flex items-center gap-1 px-6 py-3 text-sm overflow-x-auto">
        <Link href="/" className="mr-4 flex items-center gap-2 font-bold text-accent shrink-0">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground text-xs">
            V
          </span>
          SahaIçi
        </Link>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-1.5 font-medium transition ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {session ? (
            <>
              <Link
                href="/hesabim"
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  pathname === "/hesabim"
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                Hesabım
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-md px-3 py-1.5 font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              >
                Çıkış
              </button>
            </>
          ) : (
            <Link
              href="/giris"
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                pathname === "/giris"
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
