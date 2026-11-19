import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import liquorImage from "../../assets/business-types/web/liquor.jpg";
import retailImage from "../../assets/business-types/web/retail.jpg";
import pharmacyImage from "../../assets/business-types/web/pharmacy.jpg";
import salonImage from "../../assets/business-types/web/salon.jpg";
import fishImage from "../../assets/business-types/web/fish.jpg";

// "See it for your business": one slide per business type, each a real
// photo next to what the app shows that business. Sample data only uses
// features the app really has for that type (shops: no customer debts).

// Restaurant photo: rice and meat (pilau style) by Eugene Krasnaok, free
// under the Unsplash License (unsplash.com/photos/ojDzHZHcVx4). Loaded from
// Unsplash; replace with a photo of your own dishes in assets/ when you can.
const RESTAURANT_PHOTO =
  "https://images.unsplash.com/photo-1634324092526-91f5e878b72f?fm=jpg&q=70&w=1200&h=900&fit=crop&auto=format";

type Row = { label: string; value: string; tone?: "warn" | "good" };

interface Slide {
  key: string;
  nameKey: string;
  name: string;
  photo: string;
  photoAlt: string;
  credit?: string;
  screenKey: string;
  screen: string;
  rows: Row[];
  totalLabelKey: string;
  totalLabel: string;
  total: string;
  highlight: { labelKey: string; label: string; value: string; tone: "yellow" | "red" | "green" };
  points: { key: string; en: string }[];
}

const SLIDES: Slide[] = [
  {
    key: "restaurant",
    nameKey: "slide.restaurant", name: "Restaurant",
    photo: RESTAURANT_PHOTO, photoAlt: "A plate of pilau rice with meat and salad", credit: "Photo: Eugene Krasnaok / Unsplash",
    screenKey: "slide.screen.counter", screen: "Counter",
    rows: [
      { label: "Wali maharage ×2", value: "6,000" },
      { label: "Chai", value: "500" },
      { label: "Soda", value: "1,000" },
      { label: "Customer gives", value: "10,000" },
    ],
    totalLabelKey: "counter.total", totalLabel: "Total", total: "7,500",
    highlight: { labelKey: "counter.giveChange", label: "Give change", value: "Tsh 2,500", tone: "yellow" },
    points: [
      { key: "slide.r1", en: "Change worked out for every cash payment" },
      { key: "slide.r2", en: "Unpaid amounts saved as debts with name and phone" },
      { key: "slide.r3", en: "Daily book: food sold, money received, debts" },
    ],
  },
  {
    key: "liquor",
    nameKey: "slide.liquor", name: "Liquor store / Bar",
    photo: liquorImage, photoAlt: "Shelves of wine and spirits in a liquor store",
    screenKey: "slide.screen.sale", screen: "New sale",
    rows: [
      { label: "Konyagi 750ml ×1", value: "18,000" },
      { label: "Safari Lager ×4", value: "12,000" },
      { label: "Paid by", value: "M-Pesa" },
      { label: "Safari Lager left", value: "46", tone: "good" },
    ],
    totalLabelKey: "counter.total", totalLabel: "Total", total: "30,000",
    highlight: { labelKey: "slide.lowStock", label: "Running low", value: "Konyagi 750ml: 3 left", tone: "red" },
    points: [
      { key: "slide.l1", en: "Stock goes down by itself with every sale" },
      { key: "slide.l2", en: "Warning before a brand runs out" },
      { key: "slide.l3", en: "Cash, card and mobile money in one total" },
    ],
  },
  {
    key: "retail",
    nameKey: "slide.retail", name: "Shop / Duka",
    photo: retailImage, photoAlt: "A small shop with drinks and goods stacked at the front",
    screenKey: "slide.screen.stock", screen: "Low stock",
    rows: [
      { label: "Sukari 1kg", value: "3 left", tone: "warn" },
      { label: "Mafuta ya kupikia 1L", value: "5 left", tone: "warn" },
      { label: "Unga wa sembe 2kg", value: "8 left", tone: "warn" },
      { label: "Supplier owed", value: "120,000" },
    ],
    totalLabelKey: "slide.todaySales", totalLabel: "Today's sales", total: "412,500",
    highlight: { labelKey: "slide.profit", label: "Today's profit", value: "Tsh 61,800", tone: "green" },
    points: [
      { key: "slide.s1", en: "See what to restock before customers ask" },
      { key: "slide.s2", en: "Suppliers and how much you owe each" },
      { key: "slide.s3", en: "Profit for the day, not just sales" },
    ],
  },
  {
    key: "pharmacy",
    nameKey: "slide.pharmacy", name: "Pharmacy",
    photo: pharmacyImage, photoAlt: "A customer looking at shelves in a pharmacy",
    screenKey: "slide.screen.products", screen: "Products",
    rows: [
      { label: "Panadol 500mg (pack)", value: "24 in stock" },
      { label: "ORS sachets", value: "40 in stock" },
      { label: "Amoxicillin 250mg", value: "6 in stock", tone: "warn" },
      { label: "Vitamin C", value: "18 in stock" },
    ],
    totalLabelKey: "slide.todaySales", totalLabel: "Today's sales", total: "186,000",
    highlight: { labelKey: "slide.lowStock", label: "Running low", value: "Amoxicillin: 6 left", tone: "red" },
    points: [
      { key: "slide.p1", en: "Every product with its stock count" },
      { key: "slide.p2", en: "Staff logins that only see what they need" },
      { key: "slide.p3", en: "Expenses and reports for the month" },
    ],
  },
  {
    key: "salon",
    nameKey: "slide.salon", name: "Salon / Barber",
    photo: salonImage, photoAlt: "A barber cutting a customer's hair",
    screenKey: "slide.screen.sale", screen: "New sale",
    rows: [
      { label: "Hair oil ×3", value: "15,000" },
      { label: "Shampoo ×2", value: "16,000" },
      { label: "Relaxer ×1", value: "12,000" },
      { label: "Paid by", value: "M-Pesa" },
    ],
    totalLabelKey: "counter.total", totalLabel: "Total", total: "43,000",
    highlight: { labelKey: "slide.expenses", label: "Expenses today", value: "Tsh 12,000", tone: "green" },
    points: [
      { key: "slide.sa1", en: "Sell hair products and keep their stock right" },
      { key: "slide.sa2", en: "Customer list with phone numbers" },
      { key: "slide.sa3", en: "Rent, power and supplies as expenses" },
    ],
  },
  {
    key: "fish",
    nameKey: "slide.fish", name: "Fish market",
    photo: fishImage, photoAlt: "A busy indoor fish market with sellers and buyers",
    screenKey: "slide.screen.sale", screen: "New sale",
    rows: [
      { label: "Sangara (large) ×3", value: "45,000" },
      { label: "Dagaa (bucket) ×1", value: "15,000" },
      { label: "Paid by", value: "Cash" },
      { label: "Owed to fishermen", value: "80,000" },
    ],
    totalLabelKey: "counter.total", totalLabel: "Total", total: "60,000",
    highlight: { labelKey: "slide.todaySales", label: "Today's sales", value: "Tsh 540,000", tone: "green" },
    points: [
      { key: "slide.f1", en: "Every sale recorded as it happens" },
      { key: "slide.f2", en: "What you owe each supplier" },
      { key: "slide.f3", en: "Know the day's takings before you close" },
    ],
  },
];

const HIGHLIGHT = {
  yellow: "bg-[#FFF4D6] text-[#7A4F00]",
  red: "bg-[#FDECEA] text-[#9B2C1F]",
  green: "bg-[#E6F4EC] text-[#0B5639]",
};

export function BusinessSlider() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const slide = SLIDES[index];

  function go(next: number, focus = false) {
    const i = (next + SLIDES.length) % SLIDES.length;
    setIndex(i);
    if (focus) tabsRef.current[i]?.focus();
  }

  function onTabKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true); }
  }

  return (
    <div className="mt-10">
      {/* Business tabs */}
      <div role="tablist" aria-label={t("slide.tabs", "Business types")} onKeyDown={onTabKey}
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            ref={(el) => { tabsRef.current[i] = el; }}
            role="tab"
            id={`biz-tab-${s.key}`}
            aria-selected={i === index}
            aria-controls="biz-panel"
            tabIndex={i === index ? 0 : -1}
            onClick={() => go(i)}
            className={`shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
              i === index ? "bg-[#12352B] text-white" : "bg-white text-[#3B4642] ring-1 ring-[#D5DDD8] hover:ring-[#9CC4AE]"
            }`}
          >
            {t(s.nameKey, s.name)}
          </button>
        ))}
      </div>

      {/* Slide */}
      <div id="biz-panel" role="tabpanel" aria-labelledby={`biz-tab-${slide.key}`}
        className="mt-6 grid overflow-hidden rounded-3xl bg-white ring-1 ring-[#DDE5E0] lg:grid-cols-[1.15fr_1fr]">
        <Photo key={slide.key} src={slide.photo} alt={slide.photoAlt} credit={slide.credit} name={t(slide.nameKey, slide.name)} />

        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <PhoneScreen title={t(slide.screenKey, slide.screen)}>
            <ul className="space-y-1.5 text-[13px] tabular-nums">
              {slide.rows.map((r) => (
                <li key={r.label} className="flex justify-between gap-3">
                  <span className="text-[#3B4642]">{r.label}</span>
                  <span className={r.tone === "warn" ? "font-semibold text-[#B45309]" : r.tone === "good" ? "font-semibold text-[#0F6B47]" : ""}>
                    {r.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex justify-between border-t border-[#E4EAE6] pt-2 text-[14px] font-bold tabular-nums">
              <span>{t(slide.totalLabelKey, slide.totalLabel)}</span>
              <span>Tsh {slide.total}</span>
            </div>
            <div className={`mt-3 rounded-xl p-2.5 text-center ${HIGHLIGHT[slide.highlight.tone]}`}>
              <p className="text-[11px] font-semibold opacity-80">{t(slide.highlight.labelKey, slide.highlight.label)}</p>
              <p className="home-display text-lg font-extrabold">{slide.highlight.value}</p>
            </div>
          </PhoneScreen>

          <ul className="space-y-2.5 text-[15px] text-[#3B4642]">
            {slide.points.map((p) => (
              <li key={p.key} className="flex gap-2">
                <Check size={17} className="mt-0.5 shrink-0 text-[#0F6B47]" />
                {t(p.key, p.en)}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex gap-1.5" aria-hidden="true">
              {SLIDES.map((s, i) => (
                <span key={s.key} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-[#0F6B47]" : "w-1.5 bg-[#C9D5CE]"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(index - 1)} aria-label={t("slide.prev", "Previous business")}
                className="rounded-full p-2.5 ring-1 ring-[#D5DDD8] hover:bg-[#F4F8F5]">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label={t("slide.next", "Next business")}
                className="rounded-full bg-[#0F6B47] p-2.5 text-white hover:bg-[#0B5639]">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Photo({ src, alt, credit, name }: { src: string; alt: string; credit?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="relative min-h-[260px] bg-[#12352B] lg:min-h-[460px]">
      {!failed && (
        <img src={src} alt={alt} onError={() => setFailed(true)}
          className="home-fade absolute inset-0 h-full w-full object-cover" />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-16 text-white">
        <span className="home-display text-2xl font-bold">{name}</span>
        {credit && !failed && <span className="text-[11px] text-white/70">{credit}</span>}
      </figcaption>
    </figure>
  );
}

function PhoneScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[300px] rounded-[26px] border-[6px] border-[#12352B] bg-white p-4 shadow-[0_20px_40px_-22px_rgba(18,53,43,0.55)]">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#DCE3DF]" />
      <p className="home-display mb-2 text-[14px] font-bold">{title}</p>
      {children}
    </div>
  );
}
