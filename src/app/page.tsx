import Link from "next/link";
import { ArrowRight, ShieldCheck, Repeat, Receipt, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="paper-texture min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <Link href="/">
            <div className="flex items-center justify-center gap-2">
            <Landmark className="h-5 w-5 text-forest-600" />
            <span className="font-display italic text-xl">AjoFlow</span>
            </div>  
          </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="text-sm font-medium text-ink/70 hover:text-ink">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 md:pb-24 md:pt-10">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-forest-600">
            Ajo · Esusu · Pay small small
          </p>
          <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
            Every contribution, every turn, <em className="text-forest-600">accounted for.</em>
          </h1>
          <p className="mt-5 max-w-md text-ink/60">
            AjoFlow turns a paper notebook and a WhatsApp group into a single source of truth —
            for savings circles and for vendors selling on installments.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link href="/signup">
              <Button className="w-full sm:w-auto">
                Start a group <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="w-full sm:w-auto">I already have an account</Button>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            <Feature icon={Repeat} label="Strict payout order" />
            <Feature icon={Receipt} label="Immutable audit log" />
            <Feature icon={ShieldCheck} label="Role-based access" />
          </div>
        </div>

        <HeroWheel />
      </section>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
      <span className="text-sm text-ink/60">{label}</span>
    </div>
  );
}

function HeroWheel() {
  const members = [
    { order: 1, status: "done" },
    { order: 2, status: "done" },
    { order: 3, status: "next" },
    { order: 4, status: "waiting" },
    { order: 5, status: "waiting" },
    { order: 6, status: "waiting" }
  ];
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 40;

  return (
    <div className="flex justify-center md:justify-end">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[320px]">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#DCD7C9" />
        {members.map((m, i) => {
          const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const fill = m.status === "done" ? "#2F7A4F" : m.status === "next" ? "#CC9E2E" : "#FFFFFF";
          return (
            <g key={m.order}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="#DCD7C9" strokeDasharray={m.status === "waiting" ? "2 4" : undefined} />
              <circle cx={x} cy={y} r={m.status === "next" ? 18 : 13} fill={fill} stroke="#0F1B14" strokeOpacity={0.1} />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill={m.status === "waiting" ? "#0F1B14" : "#fff"}>
                {m.order}
              </text>
            </g>
          );
        })}
        <circle cx={center} cy={center} r={36} fill="#F5F7F1" stroke="#DCD7C9" />
        <text x={center} y={center - 6} textAnchor="middle" fontSize={10} fill="#0F1B14" opacity={0.5}>
          THIS CYCLE
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1B4A2F">
          Turn #3
        </text>
      </svg>
    </div>
  );
}
