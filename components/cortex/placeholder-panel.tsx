type PlaceholderPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPanel({
  eyebrow,
  title,
  description,
}: PlaceholderPanelProps) {
  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-10 md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.16),_transparent_60%)]" />
      <div className="relative space-y-4 rounded-2xl border border-border/80 bg-card/70 p-8 shadow-sm backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center text-[13px] text-muted-foreground">
          UI placeholder — wire routes when you connect backends.
        </div>
      </div>
    </div>
  );
}
