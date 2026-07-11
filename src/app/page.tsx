import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">VAT — Video Analysis Tactics</h1>
      <p className="text-black/70 dark:text-white/70">
        Manage teams, players, and matches for tactical video analysis.
      </p>
      <div className="flex gap-4 mt-2">
        <Link
          href="/teams"
          className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Teams
        </Link>
        <Link
          href="/players"
          className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Players
        </Link>
        <Link
          href="/matches"
          className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Matches
        </Link>
      </div>
    </div>
  );
}
