import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, MessageCircle, RefreshCw } from "lucide-react";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { BUSINESS_TYPES } from "../../lib/businessTypes";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

// Platform control room. Dark on purpose (fixed colours, so it looks the
// same in light and dark mode): a laptop screen for watching the business.

type Level = "active" | "trying" | "quiet" | "new" | "signed_up_only";

interface Overview {
  generatedAt: string;
  ticker: { newToday: number; salesToday: number; collectedToday: number; users: number; expiringSoon: number };
  income: {
    mrr: number;
    arr: number;
    collectedThisMonth: number;
    collectedLastMonth: number;
    collectedGrowth: number | null;
    payingNow: number;
  };
  churn: { rate: number; lapsed: number; lostIncome: number; expiring: number; atRisk: number };
  businesses: {
    total: number;
    newThisMonth: number;
    newLastMonth: number;
    newGrowth: number | null;
    byPlan: Record<"FREE" | "STARTER" | "PRO", number>;
  };
  engagement: {
    activeThisWeek: number;
    activeRate: number;
    levels: Record<Level, number>;
    everPaid: number;
    freeToPaidRate: number;
    medianDaysToFirstSale: number | null;
  };
  trajectory: { month: string; label: string; businesses: number; selling: number; collected: number }[];
  byPlan: { plan: "PRO" | "STARTER" | "FREE"; businesses: number; paying: number; monthlyIncome: number }[];
  funnel: { key: "registered" | "setUp" | "firstSale" | "activeWeek" | "paying"; count: number; percent: number }[];
  byType: { industry: string; businesses: number; active: number; paying: number; newThisMonth: number }[];
  cohorts: {
    month: string;
    label: string;
    businesses: number;
    cells: ({ selling: number; percent: number; partial: boolean } | null)[];
  }[];
  movement: {
    newPaying: number;
    newPayers: number;
    renewals: number;
    lostIncome: number;
    lapsed: number;
    atRisk: number;
    expiring: number;
  };
  attention: {
    tenantId: string;
    name: string;
    plan: string;
    priceTzs: number | null;
    paidUntil: string | null;
    due: "expiring" | "expired";
    phone: string | null;
  }[];
}

type ActivityEvent =
  | { id: string; type: "registered"; tenantId: string; businessName: string; at: string }
  | { id: string; type: "paymentReceived"; tenantId: string; businessName: string; at: string; amount: number; plan: string }
  | { id: string; type: "userAdded"; tenantId: string; businessName: string; at: string; person: string };

// Palette (fixed, not theme classes).
const C = {
  bg: "#0b1120",
  panel: "#111a2c",
  line: "#1e2a42",
  text: "#e8edf6",
  muted: "#9aa6bd",
  dim: "#6b7891",
  amber: "#f5b301",
  blue: "#38bdf8",
  green: "#34d399",
  red: "#f87171",
  violet: "#a78bfa",
};

const nf = new Intl.NumberFormat("en-US");
const tsh = (v: number) => `Tsh ${nf.format(Math.round(v))}`;
function tshShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `Tsh ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2).replace(/\.0+$/, "")}M`;
  if (Math.abs(v) >= 1_000) return `Tsh ${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `Tsh ${nf.format(v)}`;
}

export function SuperAdminDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<Overview | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/superadmin/overview"), api.get("/superadmin/activity")])
      .then(([o, a]) => {
        setData(o.data.data);
        setActivity(a.data.data);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.dashboard.error.load", "Failed to load platform overview"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const updated = data
    ? new Date(new Date(data.generatedAt).getTime() + 3 * 3600_000).toISOString().slice(11, 16)
    : "--:--";

  return (
    <div
      className="-m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-screen"
      style={{ backgroundColor: C.bg, color: C.text }}
    >
      {/* Top bar */}
      <header
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3 mb-3 border"
        style={{ backgroundColor: C.panel, borderColor: C.line }}
      >
        <div className="flex items-center gap-3 mr-auto">
          <span className="grid place-items-center w-8 h-8 rounded-md font-black text-sm" style={{ backgroundColor: C.amber, color: C.bg }}>
            AB
          </span>
          <div>
            <p className="font-bold leading-tight">AB BusinessHub</p>
            <p className="text-xs" style={{ color: C.muted }}>
              {t("sa.subtitle", "Platform operations and income")}
            </p>
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <TopStat label={t("sa.mrr", "Monthly income")} value={tshShort(data.income.mrr)} color={C.amber} />
            <TopStat label={t("sa.arr", "Yearly run-rate")} value={tshShort(data.income.arr)} />
            <TopStat label={t("sa.businesses", "Businesses")} value={nf.format(data.businesses.total)} />
            <TopStat label={t("sa.paying", "Paying")} value={nf.format(data.income.payingNow)} color={C.green} />
          </div>
        )}
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:opacity-80"
          style={{ borderColor: C.line, color: C.muted }}
          title={t("sa.refresh", "Refresh")}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loading ? C.amber : C.green }} />
          {t("sa.updated", "Updated")} {updated} EAT
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Today strip */}
      {data && (
        <div
          className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg px-4 py-2 mb-5 text-sm border"
          style={{ borderColor: C.line, color: C.muted }}
        >
          <span className="font-semibold" style={{ color: C.text }}>
            {t("sa.today", "Today")}
          </span>
          <span>
            {t("sa.today.new", "New businesses")}: <b style={{ color: C.text }}>{data.ticker.newToday}</b>
          </span>
          <span>
            {t("sa.today.sales", "Sales on the platform")}: <b style={{ color: C.text }}>{nf.format(data.ticker.salesToday)}</b>
          </span>
          <span>
            {t("sa.today.collected", "Money received")}: <b style={{ color: C.green }}>{tsh(data.ticker.collectedToday)}</b>
          </span>
          <span>
            {t("sa.today.users", "User accounts")}: <b style={{ color: C.text }}>{nf.format(data.ticker.users)}</b>
          </span>
          <span>
            {t("sa.today.expiring", "Plans ending in 7 days")}:{" "}
            <b style={{ color: data.ticker.expiringSoon ? C.red : C.text }}>{data.ticker.expiringSoon}</b>
          </span>
        </div>
      )}

      <ErrorBanner message={error} />

      {!data ? (
        <p className="py-20 text-center" style={{ color: C.muted }}>
          {t("common.loading", "Loading...")}
        </p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <Kpi
              accent={C.amber}
              label={t("sa.kpi.mrr", "Monthly income (paid plans)")}
              value={tsh(data.income.mrr)}
              pill={
                <GrowthPill
                  value={data.income.collectedGrowth}
                  suffix={t("sa.vsLastMonth", "received vs last month")}
                  fallback={t("sa.noCompare", "No last-month figure")}
                />
              }
              foot={`${t("sa.kpi.collected", "Received this month")}: ${tsh(data.income.collectedThisMonth)} · ${t("sa.kpi.lastMonth", "last month")}: ${tsh(data.income.collectedLastMonth)}`}
            />
            <Kpi
              accent={C.red}
              label={t("sa.kpi.churn", "Plans not renewed (30 days)")}
              value={`${data.churn.rate}%`}
              pill={
                <Pill color={data.churn.expiring ? C.red : C.blue}>
                  {data.churn.expiring} {t("sa.kpi.endingSoon", "ending in 7 days")}
                </Pill>
              }
              foot={`${t("sa.kpi.lapsed", "Not renewed")}: ${data.churn.lapsed} · ${t("sa.kpi.lost", "income lost")}: ${tsh(data.churn.lostIncome)}`}
            />
            <Kpi
              accent={C.green}
              label={t("sa.kpi.businesses", "Registered businesses")}
              value={nf.format(data.businesses.total)}
              pill={<Pill color={C.green}>+{data.businesses.newThisMonth} {t("sa.kpi.thisMonth", "this month")}</Pill>}
              foot={`Free ${data.businesses.byPlan.FREE} · Starter ${data.businesses.byPlan.STARTER} · Pro ${data.businesses.byPlan.PRO}`}
            />
            <Kpi
              accent={C.violet}
              label={t("sa.kpi.active", "Selling regularly this week")}
              value={nf.format(data.engagement.activeThisWeek)}
              pill={<Pill color={C.violet}>{data.engagement.activeRate}% {t("sa.kpi.ofAll", "of all")}</Pill>}
              foot={`${t("sa.lvl.trying", "Trying")}: ${data.engagement.levels.trying} · ${t("sa.lvl.quiet", "Gone quiet")}: ${data.engagement.levels.quiet} · ${t("sa.lvl.none", "Never set up")}: ${data.engagement.levels.signed_up_only}`}
            />
          </div>

          {/* Growth chart, plans, funnel */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
            <Panel
              className="xl:col-span-6"
              title={t("sa.growth.title", "Businesses and money received (12 months)")}
              subtitle={t("sa.growth.sub", "Registered businesses, businesses that sold something, and payments per month")}
            >
              <GrowthChart points={data.trajectory} />
              <div
                className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: C.line, color: C.muted }}
              >
                <span>
                  {t("sa.growth.newGrowth", "New vs last month")}:{" "}
                  <b style={{ color: C.text }}>
                    {data.businesses.newGrowth === null ? "—" : `${data.businesses.newGrowth > 0 ? "+" : ""}${data.businesses.newGrowth}%`}
                  </b>
                </span>
                <span>
                  {t("sa.growth.toFirstSale", "Days to first sale")}:{" "}
                  <b style={{ color: C.text }}>{data.engagement.medianDaysToFirstSale ?? "—"}</b>
                </span>
                <span>
                  {t("sa.growth.everPaid", "Ever paid")}: <b style={{ color: C.green }}>{data.engagement.freeToPaidRate}%</b>
                </span>
                <span>
                  {t("sa.growth.arr", "Yearly run-rate")}: <b style={{ color: C.amber }}>{tshShort(data.income.arr)}</b>
                </span>
              </div>
            </Panel>

            <Panel className="xl:col-span-3" title={t("sa.plans.title", "Income by plan")} subtitle={t("sa.plans.sub", "Monthly income from paid-up plans")}>
              <PlanDonut rows={data.byPlan} total={data.income.mrr} />
            </Panel>

            <Panel className="xl:col-span-3" title={t("sa.funnel.title", "From sign-up to paying")} subtitle={t("sa.funnel.sub", "How far businesses get")}>
              <Funnel rows={data.funnel} />
            </Panel>
          </div>

          {/* Types, cohorts, money movement */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
            <Panel className="xl:col-span-3" title={t("sa.types.title", "Business types")} subtitle={t("sa.types.sub", "Registered, using the app, paying")}>
              <TypeBars rows={data.byType} />
            </Panel>
            <Panel
              className="xl:col-span-6"
              title={t("sa.cohorts.title", "Still selling after joining")}
              subtitle={t("sa.cohorts.sub", "Share of each month's new businesses that sold something later")}
            >
              <Cohorts rows={data.cohorts} />
            </Panel>
            <Panel className="xl:col-span-3" title={t("sa.move.title", "Money this month")} subtitle={t("sa.move.sub", "What came in and what is at risk")}>
              <Movement m={data.movement} />
            </Panel>
          </div>

          {/* Attention + activity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Panel
              title={t("sa.attention.title", "Call these businesses")}
              subtitle={t("sa.attention.sub", "Plans ending in 7 days or ended in the last 30 days")}
              action={
                <Link to="/super-admin/subscriptions" className="text-xs hover:underline" style={{ color: C.blue }}>
                  {t("sa.seeAll", "See all")}
                </Link>
              }
            >
              <Attention rows={data.attention} />
            </Panel>
            <Panel
              title={t("sa.activity.title", "Latest activity")}
              subtitle={t("sa.activity.sub", "Sign-ups, payments and new staff")}
              action={
                <Link to="/super-admin/tenants" className="text-xs hover:underline" style={{ color: C.blue }}>
                  {t("sa.seeAll", "See all")}
                </Link>
              }
            >
              <Activity events={activity ?? []} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TopStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span style={{ color: C.muted }}>
      {label}: <b style={{ color: color ?? C.text }}>{value}</b>
    </span>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-4 sm:p-5 min-w-0 ${className}`} style={{ backgroundColor: C.panel, borderColor: C.line }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold tracking-wide">{title}</h2>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}14` }}
    >
      {children}
    </span>
  );
}

function GrowthPill({ value, suffix, fallback }: { value: number | null; suffix: string; fallback: string }) {
  if (value === null) return <Pill color={C.dim}>{fallback}</Pill>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Pill color={up ? C.green : C.red}>
      <Icon size={13} />
      {up ? "+" : ""}
      {value}% {suffix}
    </Pill>
  );
}

function Kpi({ accent, label, value, pill, foot }: { accent: string; label: string; value: string; pill: ReactNode; foot: string }) {
  return (
    <section className="relative rounded-xl border p-4 sm:p-5 overflow-hidden" style={{ backgroundColor: C.panel, borderColor: C.line }}>
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      <p className="text-sm font-semibold" style={{ color: C.muted }}>
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
        {pill}
      </div>
      <p className="mt-3 pt-3 border-t text-xs" style={{ borderColor: C.line, color: C.muted }}>
        {foot}
      </p>
    </section>
  );
}

// Two count lines (registered, selling) on one scale, money received as
// bars along the bottom on its own scale.
function GrowthChart({ points }: { points: Overview["trajectory"] }) {
  const { t } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 260;
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxCount = Math.max(5, ...points.map((p) => Math.max(p.businesses, p.selling)));
  const step = Math.pow(10, Math.floor(Math.log10(maxCount)));
  const top = Math.ceil((maxCount * 1.1) / step) * step;
  const maxMoney = Math.max(1, ...points.map((p) => p.collected));
  const x = (i: number) => pad.l + (i * iw) / (points.length - 1);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const line = (key: "businesses" | "selling") => points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[key])}`).join(" ");
  const area = `${line("businesses")} L${x(points.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const last = points.length - 1;
  const h = hover ?? last;

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs mb-2" style={{ color: C.muted }}>
        <Legend color={C.amber} label={t("sa.growth.registered", "Registered businesses")} />
        <Legend color={C.blue} dashed label={t("sa.growth.selling", "Businesses that sold")} />
        <Legend color={C.green} box label={t("sa.growth.collected", "Money received")} />
        <span className="ml-auto" style={{ color: C.text }}>
          {points[h].label}: <b style={{ color: C.amber }}>{points[h].businesses}</b> ·{" "}
          <b style={{ color: C.blue }}>{points[h].selling}</b> · <b style={{ color: C.green }}>{tshShort(points[h].collected)}</b>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="saArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={C.amber} stopOpacity="0.28" />
            <stop offset="100%" stopColor={C.amber} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={C.line} />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill={C.dim}>
              {v}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const bh = (p.collected / maxMoney) * ih * 0.3;
          return (
            <rect
              key={p.month}
              x={x(i) - 9}
              y={pad.t + ih - bh}
              width={18}
              height={bh}
              rx={2}
              fill={C.green}
              opacity={i === h ? 0.7 : 0.3}
            />
          );
        })}
        <path d={area} fill="url(#saArea)" />
        <path d={line("businesses")} fill="none" stroke={C.amber} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={line("selling")} fill="none" stroke={C.blue} strokeWidth={2} strokeDasharray="5 4" />
        <line x1={x(h)} x2={x(h)} y1={pad.t} y2={pad.t + ih} stroke={C.dim} strokeDasharray="2 3" />
        <circle cx={x(h)} cy={y(points[h].businesses)} r={4} fill={C.amber} />
        <circle cx={x(h)} cy={y(points[h].selling)} r={4} fill={C.blue} />
        {points.map((p, i) => (
          <g key={`l${p.month}`}>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={i === h ? C.text : C.dim}>
              {p.label}
            </text>
            <rect
              x={x(i) - iw / (points.length - 1) / 2}
              y={pad.t}
              width={iw / (points.length - 1)}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Legend({ color, label, dashed, box }: { color: string; label: string; dashed?: boolean; box?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {box ? (
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
      ) : (
        <span className="w-4 border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />
      )}
      {label}
    </span>
  );
}

const PLAN_COLOR: Record<string, string> = { PRO: C.amber, STARTER: C.blue, FREE: C.dim };

function PlanDonut({ rows, total }: { rows: Overview["byPlan"]; total: number }) {
  const { t } = useLanguage();
  const byMoney = total > 0;
  const value = (r: Overview["byPlan"][number]) => (byMoney ? r.monthlyIncome : r.businesses);
  const sum = rows.reduce((s, r) => s + value(r), 0) || 1;
  const R = 70;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div>
      <div className="relative mx-auto w-44 h-44">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={R} fill="none" stroke={C.line} strokeWidth="20" />
          {rows.map((r) => {
            const len = (value(r) / sum) * circ;
            const seg = (
              <circle
                key={r.plan}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={PLAN_COLOR[r.plan]}
                strokeWidth="20"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return len > 0 ? seg : null;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-extrabold">{byMoney ? tshShort(total) : sum}</p>
            <p className="text-[11px]" style={{ color: C.muted }}>
              {byMoney ? t("sa.plans.perMonth", "per month") : t("sa.businesses", "Businesses")}
            </p>
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.plan} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PLAN_COLOR[r.plan] }} />
            <span className="font-semibold">{r.plan === "FREE" ? "Free" : r.plan === "PRO" ? "Pro" : "Starter"}</span>
            <span className="text-xs" style={{ color: C.muted }}>
              {r.plan === "FREE" ? r.businesses : `${r.paying}/${r.businesses}`}
            </span>
            <span className="ml-auto tabular-nums">{r.plan === "FREE" ? "—" : tshShort(r.monthlyIncome)}</span>
            <span className="w-11 text-right text-xs font-semibold" style={{ color: PLAN_COLOR[r.plan] }}>
              {Math.round((value(r) / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Funnel({ rows }: { rows: Overview["funnel"] }) {
  const { t } = useLanguage();
  const label: Record<Overview["funnel"][number]["key"], string> = {
    registered: t("sa.funnel.registered", "Signed up"),
    setUp: t("sa.funnel.setUp", "Added products"),
    firstSale: t("sa.funnel.firstSale", "Made a sale"),
    activeWeek: t("sa.funnel.active", "Selling this week"),
    paying: t("sa.funnel.paying", "Paying now"),
  };
  const colors = [C.amber, C.amber, C.blue, C.blue, C.green];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-lg border overflow-hidden" style={{ borderColor: C.line }}>
          <div className="relative px-3 py-2.5 text-sm">
            <span className="absolute inset-y-0 left-0" style={{ width: `${Math.max(r.percent, 2)}%`, backgroundColor: colors[i], opacity: 0.22 }} />
            <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: colors[i] }} />
            <span className="relative flex justify-between gap-2">
              <span className="font-semibold truncate">
                {i + 1}. {label[r.key]}
              </span>
              <span className="tabular-nums whitespace-nowrap">
                {nf.format(r.count)} <span className="text-xs" style={{ color: C.muted }}>{r.percent}%</span>
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function industryLabel(value: string, t: (k: string, f: string) => string) {
  const found = BUSINESS_TYPES.find((b) => b.value === value);
  return found ? t(found.labelKey, found.label) : value.replace(/_/g, " ");
}

function TypeBars({ rows }: { rows: Overview["byType"] }) {
  const { t } = useLanguage();
  const max = Math.max(1, ...rows.map((r) => r.businesses));
  if (rows.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.industry}>
          <div className="flex justify-between text-sm mb-1 gap-2">
            <span className="font-semibold truncate">{industryLabel(r.industry, t)}</span>
            <span className="tabular-nums font-semibold">{r.businesses}</span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: C.line }}>
            <div
              className="h-2 rounded-full"
              style={{ width: `${(r.businesses / max) * 100}%`, backgroundColor: i === 0 ? C.amber : C.blue }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            {r.active} {t("sa.types.using", "using")} · {r.paying} {t("sa.types.paying", "paying")} · +{r.newThisMonth}{" "}
            {t("sa.kpi.thisMonth", "this month")}
          </p>
        </div>
      ))}
    </div>
  );
}

function Cohorts({ rows }: { rows: Overview["cohorts"] }) {
  const { t } = useLanguage();
  const heads = [
    t("sa.cohorts.m0", "Same month"),
    t("sa.cohorts.m1", "+1 mo"),
    t("sa.cohorts.m2", "+2 mo"),
    t("sa.cohorts.m3", "+3 mo"),
    t("sa.cohorts.m6", "+6 mo"),
  ];
  const cellStyle = (p: number) => {
    const color = p >= 50 ? C.green : p >= 25 ? C.blue : p > 0 ? C.amber : C.dim;
    return { color, backgroundColor: `${color}1f` };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-xs" style={{ color: C.muted }}>
            <th className="text-left font-medium pb-2">{t("sa.cohorts.joined", "Joined")}</th>
            <th className="text-right font-medium pb-2 pr-2">{t("sa.cohorts.count", "Businesses")}</th>
            {heads.map((h) => (
              <th key={h} className="font-medium pb-2 text-center whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className="border-t" style={{ borderColor: C.line }}>
              <td className="py-2 font-semibold whitespace-nowrap">{r.label}</td>
              <td className="py-2 pr-2 text-right tabular-nums" style={{ color: C.muted }}>
                {r.businesses}
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className="py-1.5 px-1 text-center">
                  {c ? (
                    <span
                      className="inline-block min-w-[2.9rem] rounded-md px-1 py-1 text-xs font-semibold tabular-nums"
                      style={cellStyle(c.percent)}
                      title={`${c.selling}/${r.businesses}${c.partial ? " · " + t("sa.cohorts.partial", "month not finished") : ""}`}
                    >
                      {c.percent}%{c.partial ? "*" : ""}
                    </span>
                  ) : (
                    <span style={{ color: C.dim }}>—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] mt-2" style={{ color: C.dim }}>
        * {t("sa.cohorts.partial", "month not finished")}
      </p>
    </div>
  );
}

function Movement({ m }: { m: Overview["movement"] }) {
  const { t } = useLanguage();
  const ins = [
    { label: `${t("sa.move.new", "New paying businesses")} (${m.newPayers})`, value: m.newPaying },
    { label: t("sa.move.renewals", "Renewals"), value: m.renewals },
  ];
  const outs = [
    { label: `${t("sa.move.lost", "Not renewed")} (${m.lapsed})`, value: m.lostIncome },
    { label: `${t("sa.move.atRisk", "Ending in 7 days")} (${m.expiring})`, value: m.atRisk },
  ];
  const max = Math.max(1, ...ins.map((r) => r.value), ...outs.map((r) => r.value));
  const block = (title: string, rows: typeof ins, color: string, sign: string, total: number) => (
    <div className="rounded-lg border p-3" style={{ borderColor: C.line }}>
      <p className="text-xs font-bold mb-2" style={{ color }}>
        {title} ({sign}
        {tshShort(total)})
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="text-sm">
            <div className="flex justify-between gap-2">
              <span style={{ color: C.muted }}>{r.label}</span>
              <span className="font-semibold tabular-nums whitespace-nowrap" style={{ color }}>
                {sign}
                {tshShort(r.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: C.line }}>
              <div className="h-1.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const inTotal = m.newPaying + m.renewals;
  const outTotal = m.lostIncome + m.atRisk;
  return (
    <div className="space-y-3">
      {block(t("sa.move.in", "Received"), ins, C.green, "+", inTotal)}
      {block(t("sa.move.out", "Lost or at risk"), outs, C.red, "−", outTotal)}
      <p className="text-xs" style={{ color: C.muted }}>
        {t("sa.move.net", "Received minus at risk")}:{" "}
        <b style={{ color: inTotal - outTotal >= 0 ? C.green : C.red }}>{tshShort(inTotal - outTotal)}</b>
      </p>
    </div>
  );
}

function waLink(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(`Habari ${name}, kifurushi chako cha AB BusinessHub kinakaribia kuisha au kimeisha. Tunaweza kukusaidia kulipia ili uendelee?`);
  return `https://wa.me/${digits}?text=${text}`;
}

function Attention({ rows }: { rows: Overview["attention"] }) {
  const { t } = useLanguage();
  if (rows.length === 0) return <Empty text={t("sa.attention.none", "All paid plans are up to date.")} />;
  const now = Date.now();
  return (
    <ul className="divide-y" style={{ borderColor: C.line }}>
      {rows.map((r) => {
        const days = r.paidUntil ? Math.round((new Date(r.paidUntil).getTime() - now) / 86400000) : 0;
        const color = r.due === "expired" ? C.red : C.amber;
        return (
          <li key={r.tenantId} className="flex items-center gap-3 py-2.5" style={{ borderColor: C.line }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0 flex-1">
              <Link to={`/super-admin/tenants/${r.tenantId}`} className="font-semibold hover:underline truncate block">
                {r.name}
              </Link>
              <p className="text-xs" style={{ color: C.muted }}>
                {r.plan === "PRO" ? "Pro" : "Starter"} · {r.priceTzs ? tsh(r.priceTzs) : "—"} ·{" "}
                <span style={{ color }}>
                  {r.due === "expired"
                    ? t("sa.attention.endedAgo", "ended {n} days ago").replace("{n}", String(Math.abs(days)))
                    : t("sa.attention.endsIn", "ends in {n} days").replace("{n}", String(Math.max(days, 0)))}
                </span>
              </p>
            </div>
            {r.phone && (
              <a
                href={waLink(r.phone, r.name)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:opacity-80"
                style={{ borderColor: `${C.green}66`, color: C.green }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Activity({ events }: { events: ActivityEvent[] }) {
  const { t } = useLanguage();
  const rows = useMemo(() => events.slice(0, 8), [events]);
  if (rows.length === 0) return <Empty />;
  const ago = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return t("superadmin.time.justNow", "Just now");
    if (h < 24) return `${h}${t("superadmin.time.hoursAgo", "h ago")}`;
    return `${Math.floor(h / 24)}${t("superadmin.time.daysAgo", "d ago")}`;
  };
  return (
    <ul className="space-y-2.5">
      {rows.map((e) => {
        const [color, text] =
          e.type === "registered"
            ? [C.amber, t("sa.activity.registered", "registered")]
            : e.type === "paymentReceived"
              ? [C.green, `${t("sa.activity.paid", "paid")} ${tsh(e.amount)}`]
              : [C.blue, `${t("sa.activity.addedStaff", "added staff")}: ${e.person}`];
        return (
          <li key={e.id} className="flex items-center gap-3 text-sm">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="min-w-0 flex-1 truncate">
              <Link to={`/super-admin/tenants/${e.tenantId}`} className="font-semibold hover:underline">
                {e.businessName}
              </Link>{" "}
              <span style={{ color: C.muted }}>{text}</span>
            </span>
            <span className="text-xs whitespace-nowrap" style={{ color: C.dim }}>
              {ago(e.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ text }: { text?: string }) {
  const { t } = useLanguage();
  return (
    <p className="py-6 text-center text-sm" style={{ color: C.dim }}>
      {text ?? t("sa.empty", "Nothing yet.")}
    </p>
  );
}
