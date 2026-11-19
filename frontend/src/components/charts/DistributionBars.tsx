const COLORS = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-gray-400"];

interface DistributionBarsProps {
  data: { label: string; count: number }[];
}

export function DistributionBars({ data }: DistributionBarsProps) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.count, 0));
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      {sorted.map((d, i) => {
        const pct = (d.count / total) * 100;
        return (
          <div key={d.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{d.label}</span>
              <span className="text-gray-500">
                {d.count} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
