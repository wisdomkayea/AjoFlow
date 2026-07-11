import { Card } from "./Card";
import clsx from "clsx";

export function StatCard({
  label,
  value,
  hint,
  accent = false
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="group overflow-hidden p-5 transition-colors hover:border-forest-200">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p
        className={clsx(
          "ledger-figure mt-3 text-2xl font-semibold md:text-[1.75rem]",
          accent ? "text-forest-600" : "text-ink"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
      <div className="mt-4 h-1 w-16 rounded-full bg-forest-100 transition-all group-hover:w-24" />
    </Card>
  );
}
