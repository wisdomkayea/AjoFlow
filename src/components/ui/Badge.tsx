import clsx from "clsx";

type Tone = "paid" | "pending" | "missed" | "active" | "completed" | "defaulted" | "neutral";

const tones: Record<Tone, string> = {
  paid: "bg-forest-50 text-forest-700 border-forest-100",
  completed: "bg-forest-50 text-forest-700 border-forest-100",
  active: "bg-gold-200/60 text-gold-600 border-gold-400/40",
  pending: "bg-gold-200/60 text-gold-600 border-gold-400/40",
  missed: "bg-clay/10 text-clay border-clay/20",
  defaulted: "bg-clay/10 text-clay border-clay/20",
  neutral: "bg-forest-50 text-ink/60 border-line"
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-[5px] py-[1px] text-[8px] font-medium capitalize",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
