"use client";

interface WheelMember {
  id: string;
  name: string;
  payoutOrder: number;
  status: "PENDING" | "COMPLETED";
}

/**
 * Signature visual: the Ajo "rotation wheel". Esusu/Ajo groups rotate a single
 * payout around the circle of members each cycle — this renders that rotation
 * literally, rather than as a generic bar list. Completed slots fill solid,
 * the next beneficiary is called out, and the remaining slots sit as open rings.
 */
export function RotationWheel({ members }: { members: WheelMember[] }) {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 34;
  const sorted = [...members].sort((a, b) => a.payoutOrder - b.payoutOrder);
  const nextIndex = sorted.findIndex((m) => m.status === "PENDING");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[280px] overflow-visible"
        aria-label="Payout rotation wheel"
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#DCD7C9" strokeWidth={1} />
        {sorted.map((m, i) => {
          const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const isNext = i === nextIndex;
          const isDone = m.status === "COMPLETED";

          return (
            <g key={m.id}>
              <line
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={isDone ? "#2F7A4F" : "#DCD7C9"}
                strokeWidth={isNext ? 1.5 : 1}
                strokeDasharray={isDone ? undefined : "2 4"}
              />
              <circle
                cx={x}
                cy={y}
                r={isNext ? 15 : 11}
                fill={isDone ? "#2F7A4F" : isNext ? "#CC9E2E" : "#FFFFFF"}
                stroke={isDone ? "#1B4A2F" : isNext ? "#A67F20" : "#DCD7C9"}
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="ledger-figure"
                fontSize={10}
                fontWeight={600}
                fill={isDone || isNext ? "#FFFFFF" : "#0F1B14"}
              >
                {m.payoutOrder}
              </text>
            </g>
          );
        })}
        <circle cx={center} cy={center} r={30} fill="#F5F7F1" stroke="#DCD7C9" />
        <text x={center} y={center - 4} textAnchor="middle" fontSize={9} fill="#0F1B14" className="uppercase tracking-wide" opacity={0.5}>
          Turn
        </text>
        <text x={center} y={center + 11} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1B4A2F">
          {nextIndex >= 0 ? `#${sorted[nextIndex].payoutOrder}` : "Done"}
        </text>
      </svg>
      <div className="mt-4 text-center">
        {nextIndex >= 0 ? (
          <p className="text-sm text-ink/70">
            Next up: <span className="font-semibold text-forest-700">{sorted[nextIndex].name}</span>
          </p>
        ) : (
          <p className="text-sm text-ink/50">Every member has received their payout this cycle.</p>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink/40">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-forest-600 inline-block" /> Paid out
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gold-500 inline-block" /> Next
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white border border-line inline-block" /> Waiting
          </span>
        </div>
      </div>
    </div>
  );
}
