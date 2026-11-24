import { useLanguage } from "../../context/LanguageContext";

interface Month {
  label: string;
  revenue: number;
  profit: number;
}

// 1291700 -> "1.3M", 45000 -> "45K"
function compact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)}K`;
  return `${sign}${Math.round(a)}`;
}

// Revenue and profit side by side for each month. A month that made a loss
// shows its profit bar below the line, in red.
export function MonthlyRevenueChart({ months, height = 240 }: { months: Month[]; height?: number }) {
  const { t } = useLanguage();
  const max = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.profit)));
  const min = Math.min(0, ...months.map((m) => m.profit));
  const range = max - min;
  const zero = (max / range) * 100; // % from the top where the 0 line sits
  const pct = (v: number) => (Math.abs(v) / range) * 100;
  // The loss line is labelled only when it's far enough from 0 to read.
  const ticks = [max, max / 2, 0, ...(min < 0 && -min / range > 0.12 ? [min] : [])];

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" aria-hidden /> {t("dash.revenue", "Revenue")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-600" aria-hidden /> {t("dash.profit", "Profit")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" aria-hidden /> {t("dash.loss", "Loss")}
        </span>
      </div>
      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative w-10 shrink-0 text-right text-[11px] text-gray-400" style={{ height }}>
          {ticks.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${((max - v) / range) * 100}%` }}>
              {compact(v)}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((v, i) => (
            <div
              key={i}
              className={`absolute inset-x-0 border-t ${v === 0 ? "border-gray-300" : "border-dashed border-gray-100"}`}
              style={{ top: `${((max - v) / range) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex">
            {months.map((m) => {
              const loss = m.profit < 0;
              return (
                <div key={m.label} className="group relative flex flex-1 justify-center gap-1 px-1 sm:gap-1.5 sm:px-2">
                  <div
                    className="absolute w-[calc(50%-6px)] max-w-[34px] rounded-t bg-blue-600 transition-opacity group-hover:opacity-80"
                    style={{ bottom: `${100 - zero}%`, height: `${pct(m.revenue)}%`, right: "50%", marginRight: 2 }}
                    title={`${m.label} · ${t("dash.revenue", "Revenue")}: Tsh ${m.revenue.toLocaleString()}`}
                  />
                  <div
                    className={`absolute w-[calc(50%-6px)] max-w-[34px] transition-opacity group-hover:opacity-80 ${
                      loss ? "rounded-b bg-red-500" : "rounded-t bg-green-600"
                    }`}
                    style={
                      loss
                        ? { top: `${zero}%`, height: `${pct(m.profit)}%`, left: "50%", marginLeft: 2 }
                        : { bottom: `${100 - zero}%`, height: `${pct(m.profit)}%`, left: "50%", marginLeft: 2 }
                    }
                    title={`${m.label} · ${loss ? t("dash.loss", "Loss") : t("dash.profit", "Profit")}: Tsh ${m.profit.toLocaleString()}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* x axis */}
      <div className="ml-12 mt-2 flex">
        {months.map((m, i) => (
          <span
            key={m.label}
            className={`flex-1 text-center text-xs ${i === months.length - 1 ? "font-semibold text-gray-700" : "text-gray-400"}`}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
