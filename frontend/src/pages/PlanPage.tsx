import { useEffect, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { fetchPlanUsage, type PlanOption, type PlanUsage, type UsageRow } from "../lib/planUsage";
import { upgradeWhatsAppLink } from "../lib/planContact";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

const fmt = (n: number) => n.toLocaleString();

function limitText(n: number | null, unlimited: string) {
  return n === null ? unlimited : fmt(n);
}

function UsageBar({ row, note, unlimited }: { row: UsageRow; note?: string; unlimited: string }) {
  const pct = row.limit === null ? 0 : Math.min(100, Math.round((row.used / Math.max(row.limit, 1)) * 100));
  const color =
    row.level === "reached" ? "bg-red-500" : row.level === "near" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">{row.label}</span>
        <span className="tabular-nums text-gray-900">
          <span className="font-semibold">{fmt(row.used)}</span>
          <span className="text-gray-400"> / {limitText(row.limit, unlimited)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: row.limit === null ? "4%" : `${Math.max(pct, 2)}%` }} />
      </div>
      {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
    </div>
  );
}

export function PlanPage() {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanUsage()
      .then(setUsage)
      .catch((err) => setError(extractErrorMessage(err, t("plan.error", "Could not load your plan"))));
  }, [t]);

  const unlimited = t("plan.unlimited", "Unlimited");

  function priceLabel(p: PlanOption) {
    if (p.priceTzs === 0) return { main: t("plan.free", "Free"), sub: "" };
    if (p.priceTzs === null) return { main: t("plan.pilot", "Free during pilot"), sub: t("plan.pilotSub", "Price coming soon") };
    return { main: `TSh ${fmt(p.priceTzs)}`, sub: t("plan.perMonth", "per month") };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("plan.title", "Your plan")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("plan.subtitle", "See what your plan includes and how much of it you are using.")}
        </p>
      </div>

      <ErrorBanner message={error} />

      {!usage && !error && <p className="text-sm text-gray-400">{t("common.loading", "Loading...")}</p>}

      {usage && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {usage.planLabel} {t("plan.planWord", "plan")}
              </h2>
              {usage.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  {t("plan.renews", "Paid until")}{" "}
                  {new Date(usage.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <UsageBar row={usage.usage.items} unlimited={unlimited} />
              <UsageBar row={usage.usage.staff} unlimited={unlimited} />
              <UsageBar
                row={usage.usage.sales}
                unlimited={unlimited}
                note={t("plan.salesNote", "Only a reminder — sales are never stopped.")}
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {usage.plans.map((p) => {
              const current = p.name === usage.plan;
              const price = priceLabel(p);
              return (
                <div
                  key={p.name}
                  className={`flex flex-col rounded-2xl border bg-white p-5 ${current ? "border-emerald-500 ring-1 ring-emerald-500" : "border-gray-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{p.label}</h3>
                    {current && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {t("plan.current", "Current plan")}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{price.main}</p>
                  <p className="h-5 text-sm text-gray-500">{price.sub}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700">
                    <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{limitText(p.items, unlimited)} {usage.usage.items.label.toLowerCase()}</li>
                    <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{limitText(p.staff, unlimited)} {t("plan.staffAccounts", "staff accounts")}</li>
                    <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{limitText(p.monthlySales, unlimited)} {t("plan.salesPerMonth", "sales a month")}</li>
                  </ul>
                  {!current && p.name !== "FREE" && (
                    <a
                      href={upgradeWhatsAppLink(tenant?.name ?? "my business", p.label)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle size={16} />
                      {p.priceTzs === null ? t("plan.talk", "Talk to us") : t("plan.upgrade", "Upgrade on WhatsApp")}
                    </a>
                  )}
                </div>
              );
            })}
          </section>

          <p className="text-xs text-gray-400">
            {t("plan.howToPay", "To upgrade, message us on WhatsApp. Pay by mobile money and we switch your plan on — usually the same day.")}
          </p>
        </>
      )}
    </div>
  );
}

export default PlanPage;
