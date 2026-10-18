import { Card } from "@/components/ui/Card";
import clsx from "clsx";

export function PageHeader({
  badge,
  title,
  subtitle,
  actions,
  className
}: {
  badge?: React.ReactNode;

  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={clsx(
        "relative overflow-hidden p-6",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-forest-100/45 blur-2xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {badge && <div className="mb-2">{badge}</div>}
          <h1 className="font-display font-semibold text-2xl leading-tight text-ink md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink/60 md:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="w-full md:w-auto md:shrink-0">{actions}</div>}
      </div>
    </Card>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line/80 pb-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-lg text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-ink/50 md:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="w-full md:w-auto md:shrink-0">{actions}</div>}
    </div>
  );
}
