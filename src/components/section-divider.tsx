/**
 * Snapture-style section eyebrow: "// LABEL ─────────"
 * Used to break the page into clear modular sections.
 */
export function SectionDivider({
  label,
  align = "left",
  className = "",
}: {
  label: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/55 " +
        (align === "right" ? "flex-row-reverse text-right " : "") +
        className
      }
    >
      <span className="text-foreground/85">// {label}</span>
      <span className="h-px flex-1 bg-foreground/15" />
    </div>
  );
}
