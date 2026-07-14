"use client";

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
  { href: "/matches", label: "Maçlar", icon: CalendarIcon },
  { href: "/katilim", label: "Katılım", icon: CheckCircleIcon },
  { href: "/taktik", label: "Taktik", icon: TacticsBoardIcon },
  { href: "/live", label: "Canlı Takip", icon: ActivityIcon },
  { href: "/analysis", label: "Video Analiz", icon: PlayCircleIcon },
  { href: "/dashboard", label: "İstatistikler", icon: BarChartIcon },
];

export default function NavBar() {
  const pathname = usePathname();
  const { session } = useSession();

  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto max-w-7xl flex items-center gap-1 px-6 py-3 text-sm overflow-x-auto">
        <Link href="/" className="mr-4 flex items-center gap-2 font-bold text-accent shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BallIcon className="h-4 w-4" />
          </span>
          SahaIçi
        </Link>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/hesabim"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                  pathname === "/hesabim"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <UserCircleIcon className="h-4 w-4" />
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
                  ? "bg-accent text-accent-foreground shadow-sm"
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
