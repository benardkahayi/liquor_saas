import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Check, Phone, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { BusinessSlider } from "../components/landing/BusinessSlider";
import { MOCK_PLAN_PRICES } from "../lib/platformMockData";


// Home page. One idea runs through it: the exercise book (daftari) that
// small businesses keep sales and debts in — the app is that book, except
// it adds up by itself. Colours/fonts are defined in index.css (.home-*).

const BUSINESS_PHONE = "+255 759 431 401";
const BUSINESS_EMAIL = "benardkahayi@gmail.com";

const NAV_LINKS = [
  { key: "home.nav.businesses", en: "See it for your business", href: "#businesses" },
  { key: "landing.nav.pricing", en: "Pricing", href: "#pricing" },
  { key: "landing.nav.contact", en: "Contact", href: "#contact" },
];

const PLANS = [
  { plan: "FREE", productLimit: 20, seatLimit: 2, recommended: false },
  { plan: "STARTER", productLimit: 200, seatLimit: 5, recommended: true },
  { plan: "PRO", productLimit: 100000, seatLimit: 50, recommended: false },
] as const;

const tsh = (n: number) => `Tsh ${n.toLocaleString()}`;

export function LandingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardHref = user?.isSuperAdmin ? "/super-admin/dashboard" : "/dashboard";

  return (
    <div className="home bg-white text-[#1C2421]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E4EAE6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="home-display flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F6B47] text-sm font-extrabold text-white">
              AB
            </span>
            <span className="home-display text-[17px] font-bold tracking-tight">BusinessHub</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[15px] text-[#4A5652] hover:text-[#1C2421]">
                {t(l.key, l.en)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher />
            {user ? (
              <Link to={dashboardHref} className="home-btn">{t("landing.nav.goToDashboard", "Go to Dashboard")}</Link>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-[15px] font-medium text-[#1C2421] hover:text-[#0F6B47]">
                  {t("landing.nav.login", "Log in")}
                </Link>
                <Link to="/register" className="home-btn">{t("home.cta.start", "Start free")}</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" className="rounded-lg p-2">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="space-y-3 border-t border-[#E4EAE6] px-5 py-4 md:hidden">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-[15px]">
                {t(l.key, l.en)}
              </a>
            ))}
            <div className="flex flex-col gap-2 border-t border-[#EEF2EF] pt-3">
              {user ? (
                <Link to={dashboardHref} className="home-btn text-center">{t("landing.nav.goToDashboard", "Go to Dashboard")}</Link>
              ) : (
                <>
                  <Link to="/login" className="rounded-lg border border-[#D5DDD8] px-3 py-2 text-center text-[15px] font-medium">
                    {t("landing.nav.login", "Log in")}
                  </Link>
                  <Link to="/register" className="home-btn text-center">{t("home.cta.start", "Start free")}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero: the exercise book, and the same day on the phone */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <h1 className="home-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            {t("home.hero.title", "Your daftari, but it adds up by itself.")}
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#4A5652]">
            {t(
              "home.hero.subtitle",
              "Every sale, every shilling and what's left on the shelf — on your phone. Totals, change and stock are worked out for you, every day."
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register" className="home-btn home-btn-lg">{t("home.cta.create", "Create your free account")}</Link>
            <a href="#businesses" className="rounded-xl px-5 py-3.5 text-[15px] font-semibold text-[#0F6B47] hover:bg-[#EDF6F1]">
              {t("home.cta.see", "See it for your business")}
            </a>
          </div>
          <p className="mt-6 text-sm text-[#6B7772]">
            {t("home.hero.note", "Free to start. English and Kiswahili. Works on any phone or computer.")}
          </p>
        </div>

        <HeroBookAndPhone />
      </section>

      {/* One slide per business type: real photo + what the app shows */}
      <section id="businesses" className="border-y border-[#E4EAE6] bg-[#F4F8F5]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="home-display text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
              {t("home.biz.title", "See it for your business")}
            </h2>
            <p className="mt-4 text-lg text-[#4A5652]">
              {t("home.biz.subtitle", "Pick your kind of business to see what your screen looks like. You choose the type when you sign up, and the app shows the tools that fit it.")}
            </p>
          </div>
          <BusinessSlider />
        </div>
      </section>

      {/* Getting started — a real sequence */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="home-display text-3xl font-bold tracking-tight sm:text-[2.6rem]">
          {t("home.steps.title", "Ready in ten minutes")}
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            [t("home.s1.title", "Create your account"), t("home.s1.body", "Your business name, your email and what kind of business you run.")],
            [t("home.s2.title", "Add your menu or products"), t("home.s2.body", "Wali maharage 3,000, Safari Lager 3,000, Panadol 1,500 — whatever you sell, with its price.")],
            [t("home.s3.title", "Start selling"), t("home.s3.body", "Record sales during the day and check the totals at closing time.")],
          ].map(([title, body], i) => (
            <li key={title} className="border-t-2 border-[#12352B] pt-5">
              <span className="home-display text-sm font-bold text-[#0F6B47]">{t("home.step", "Step")} {i + 1}</span>
              <h3 className="home-display mt-1 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A5652]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-[#E4EAE6] bg-[#F4F8F5]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="home-display text-3xl font-bold tracking-tight sm:text-[2.6rem]">
            {t("landing.pricing.title", "Simple pricing that grows with you")}
          </h2>
          <p className="mt-3 text-lg text-[#4A5652]">{t("landing.pricing.subtitle", "Start free. Upgrade when your business needs more room.")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLANS.map(({ plan, productLimit, seatLimit, recommended }) => (
              <div
                key={plan}
                className={`relative rounded-2xl bg-white p-6 ${recommended ? "ring-2 ring-[#0F6B47]" : "border border-[#DDE5E0]"}`}
              >
                {recommended && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#0F6B47] px-2.5 py-0.5 text-xs font-semibold text-white">
                    {t("landing.pricing.recommended", "Recommended")}
                  </span>
                )}
                <h3 className="home-display text-lg font-bold">{plan.charAt(0) + plan.slice(1).toLowerCase()}</h3>
                <p className="mt-2">
                  <span className="home-display text-3xl font-extrabold">{tsh(MOCK_PLAN_PRICES[plan])}</span>
                  <span className="text-sm text-[#6B7772]"> /{t("landing.pricing.month", "month")}</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-[15px] text-[#3B4642]">
                  {[
                    t("landing.pricing.staffAccounts", "Up to {n} staff accounts").replace("{n}", String(seatLimit)),
                    t("landing.pricing.products", "Up to {n} products").replace("{n}", productLimit.toLocaleString()),
                    t("landing.pricing.feature.core", "Sales, stock & customer management"),
                    t("landing.pricing.feature.reports", "Expense tracking & reports"),
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check size={17} className="mt-0.5 shrink-0 text-[#0F6B47]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 block rounded-xl px-4 py-3 text-center text-[15px] font-semibold ${
                    recommended ? "bg-[#0F6B47] text-white hover:bg-[#0B5639]" : "border border-[#CBD6D0] hover:bg-[#F4F8F5]"
                  }`}
                >
                  {t("home.cta.start", "Start free")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#12352B] text-[#C5D6CD]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="home-display text-2xl font-bold text-white">
              {t("home.footer.title", "Close the book. Open the app.")}
            </p>
            <Link to="/register" className="home-btn home-btn-yellow mt-5 inline-block">
              {t("home.cta.create", "Create your free account")}
            </Link>
          </div>
          <div className="space-y-2 text-[15px]">
            <a href={`tel:${BUSINESS_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white">
              <Phone size={16} className="text-[#F2B21B]" /> {BUSINESS_PHONE}
            </a>
            <a href={`mailto:${BUSINESS_EMAIL}`} className="flex items-center gap-2 hover:text-white">
              <Mail size={16} className="text-[#F2B21B]" /> {BUSINESS_EMAIL}
            </a>
            <p className="pt-3 text-sm text-[#8FA79A]">
              © {new Date().getFullYear()} AB BusinessHub. {t("landing.footer.rights", "All rights reserved.")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// The memorable moment: a handwritten exercise-book page, and the phone
// that replaces it sliding in on top with the same sale already added up.
function HeroBookAndPhone() {
  const { t } = useLanguage();
  return (
    <div className="relative mx-auto w-full max-w-[520px] pb-24 pr-6 sm:pb-10 sm:pr-10">
      <div className="home-book relative -rotate-2 rounded-md px-7 pb-8 pt-6 shadow-[0_18px_40px_-18px_rgba(18,53,43,0.45)] sm:px-10">
        <p className="home-hand text-[23px] leading-[34px] text-[#1E3A8A] sm:text-[26px]">19/11 — Mauzo</p>
        <div className="home-hand mt-1 text-[18px] leading-[34px] text-[#22325E] sm:text-[22px]">
          <p>Wali maharage ×2 …… 6,000</p>
          <p>Chai ×1 …… 500</p>
          <p>Soda …… 1,000</p>
          <p>Jumla 7,500, kapewa 10,000</p>
          <p>
            chenji <span className="text-[#C0392B] line-through decoration-2">2,000</span>
            <span className="text-[#C0392B]"> 2,500?</span>
          </p>
          <p className="text-[#C0392B]">Madeni: Juma 2,500, Asha ???</p>
        </div>
      </div>

      <div className="home-phone absolute -bottom-2 right-0 w-[164px] rounded-[26px] border-[6px] border-[#12352B] bg-white p-3 sm:w-[220px] sm:rounded-[30px] sm:border-[7px] sm:p-3.5 shadow-[0_24px_50px_-20px_rgba(18,53,43,0.6)] sm:w-[220px]">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#DCE3DF]" />
        <p className="home-display text-[13px] font-bold">{t("counter.bill", "Bill")}</p>
        <ul className="mt-2 space-y-1.5 text-[12px] tabular-nums">
          <li className="flex justify-between"><span>Wali maharage ×2</span><span>6,000</span></li>
          <li className="flex justify-between"><span>Chai</span><span>500</span></li>
          <li className="flex justify-between"><span>Soda</span><span>1,000</span></li>
        </ul>
        <div className="mt-2 flex justify-between border-t border-[#E4EAE6] pt-2 text-[13px] font-bold tabular-nums">
          <span>{t("counter.total", "Total")}</span><span>7,500</span>
        </div>
        <div className="mt-3 rounded-xl bg-[#FFF4D6] p-2.5 text-center">
          <p className="text-[11px] font-semibold text-[#8A5A00]">{t("counter.giveChange", "Give change")}</p>
          <p className="home-display text-xl font-extrabold text-[#7A4F00]">Tsh 2,500</p>
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-[#6B7772]">
          {t("home.phone.debt", "Juma Hamisi owes Tsh 2,500 — saved")}
        </p>
      </div>
    </div>
  );
}
