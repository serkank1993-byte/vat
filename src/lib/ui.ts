export const card = "rounded-xl border border-border bg-surface p-5 shadow-sm";

export const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-foreground/60";

export const input =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent/50 transition-shadow";

export const primaryButton =
  "rounded-lg bg-accent text-accent-foreground font-medium px-4 py-2 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

export const secondaryButton =
  "rounded-lg border border-border px-4 py-2 font-medium hover:bg-foreground/5 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

export const dangerLink = "text-sm text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed";

export const chip = (active: boolean) =>
  `rounded-lg border px-4 py-3 text-base font-medium transition ${
    active
      ? "bg-accent text-accent-foreground border-transparent"
      : "border-border hover:bg-foreground/5"
  }`;

export const pageTitle = "text-2xl font-bold tracking-tight";
