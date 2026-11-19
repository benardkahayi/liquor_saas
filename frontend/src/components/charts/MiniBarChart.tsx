interface MiniBarChartProps {
  points: { label: string; value: number }[];
  height?: number;
}

export function MiniBarChart({ points, height = 160 }: MiniBarChartProps) {
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        const barHeight = Math.max(4, (p.value / max) * (height - 24));
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
            <div
              className={`w-full rounded-t transition-colors ${
                isLast ? "bg-blue-600" : "bg-blue-100 group-hover:bg-blue-200"
              }`}
              style={{ height: barHeight }}
              title={`${p.label}: ${p.value.toLocaleString()}`}
            />
            <span className="text-[10px] text-gray-400">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}
