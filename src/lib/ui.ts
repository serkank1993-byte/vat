export const card = "rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow";

export const cardInteractive =
  "rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-accent/40";

export const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-foreground/60";

export const input =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent/50 transition-shadow";

export const primaryButton =
  "inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground font-medium px-4 py-2 shadow-sm hover:brightness-110 hover:shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

export const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-medium hover:bg-foreground/5 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

export const dangerLink = "text-sm text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed";

export const chip = (active: boolean) =>
  `rounded-lg border px-4 py-3 text-base font-medium transition ${
    active
      ? "bg-accent text-accent-foreground border-transparent shadow-sm"
      : "border-border hover:bg-foreground/5"
  }`;

export const pageTitle = "text-2xl sm:text-3xl font-bold tracking-tight";

export const pageEyebrow = "text-xs font-semibold uppercase tracking-widest text-accent";

export const iconBadge =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent";

export const emptyState =
  "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-foreground/50";
