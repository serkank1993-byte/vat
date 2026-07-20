"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import {
  ActivityIcon,
  BallIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  CloseIcon,
  MenuIcon,
  PlayCircleIcon,
  ShieldIcon,
  TacticsBoardIcon,
  UserCircleIcon,
  UserIcon,
} from "@/lib/icons";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/teams", label: "Takımlar", icon: ShieldIcon },
  { href: "/players", label: "Oyuncular", icon: UserIcon },
  { href: "/matches", label: "Fikstür", icon: CalendarIcon },
  { href: "/katilim", label: "Katılım", icon: CheckCircleIcon },
  { href: "/taktik", label: "Taktik", icon: TacticsBoardIcon },
  { href: "/live", label: "Canlı Takip", icon: ActivityIcon },
  { href: "/analysis", label: "Video Analiz", icon: PlayCircleIcon },
  { href: "/dashboard", label: "İstatistikler", icon: BarChartIcon },
  { href: "/hesabim", label: "Hesabım", icon: UserCircleIcon },
];

export default function NavBar() {
  const pathname = usePathname();
  const { session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Rota değişince mobil menüyü kapat.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  function linkClass(active: boolean) {
    return `flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors duration-300 ${
      active
        ? "bg-accent text-accent-foreground shadow-sm"
        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
    }`;
  }

  function mobileLinkClass(active: boolean) {
    return `flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors duration-300 ${
      active
        ? "bg-accent text-accent-foreground shadow-sm"
        : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
    }`;
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur transition-colors duration-300">
      <div className="mx-auto max-w-7xl flex items-center gap-1 px-4 sm:px-6 py-3 text-sm">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-accent shrink-0 transition-colors duration-300"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors duration-300">
            <BallIcon className="h-4 w-4" />
          </span>
          Rohan FC
        </Link>

        {/* Masaüstü: yatay menü (xl ve üzeri) */}
        <div className="ml-4 hidden xl:flex items-center gap-1">
          {session &&
            LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className={linkClass(pathname === link.href)}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
        </div>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          <ThemeToggle />
          {session ? (
            <>
              {/* Masaüstü çıkış butonu */}
              <button
                onClick={() => supabase.auth.signOut()}
                className="hidden xl:block rounded-md px-3 py-1.5 font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors duration-300"
              >
                Çıkış
              </button>
              {/* Mobil/tablet: hamburger */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
                aria-expanded={menuOpen}
                className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors duration-300"
              >
                {menuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </>
          ) : (
            <Link
              href="/giris"
              className={`rounded-md px-3 py-1.5 font-medium transition-colors duration-300 ${
                pathname === "/giris"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>

      {/* Mobil/tablet açılır menü */}
      {session && menuOpen && (
        <div className="xl:hidden border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col gap-1">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className={mobileLinkClass(pathname === link.href)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMenuOpen(false);
                supabase.auth.signOut();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors duration-300"
            >
              <CloseIcon className="h-5 w-5 shrink-0" />
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
