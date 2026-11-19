// One place for what each plan allows and costs. Change numbers here only.
//
// - products: shop products, or menu items for a restaurant
// - staff: user accounts (the owner counts as one)
// - monthlySales: completed sales/orders per calendar month (East Africa
//   Time). Going over this only shows a warning — a sale is NEVER blocked,
//   so a busy counter never has to fall back to the paper book.
// - priceTzs: monthly price. `restaurant: null` means "not set yet" — shown
//   as "Free during pilot" until real restaurant prices are chosen.

export type PlanName = "FREE" | "STARTER" | "PRO";

export const UNLIMITED = null;

export interface PlanConfig {
  name: PlanName;
  label: string;
  products: number | null;
  staff: number | null;
  monthlySales: number | null;
  priceTzs: { default: number; restaurant: number | null };
}

export const PLANS: Record<PlanName, PlanConfig> = {
  FREE: {
    name: "FREE",
    label: "Free",
    products: 50,
    staff: 2,
    monthlySales: 300,
    priceTzs: { default: 0, restaurant: 0 },
  },
  STARTER: {
    name: "STARTER",
    label: "Starter",
    products: 500,
    staff: 5,
    monthlySales: 3000,
    priceTzs: { default: 50_000, restaurant: null },
  },
  PRO: {
    name: "PRO",
    label: "Pro",
    products: UNLIMITED,
    staff: 30,
    monthlySales: UNLIMITED,
    priceTzs: { default: 100_000, restaurant: null },
  },
};

export const PLAN_ORDER: PlanName[] = ["FREE", "STARTER", "PRO"];

export function priceFor(plan: PlanName, industry: string | null | undefined): number | null {
  const p = PLANS[plan].priceTzs;
  return industry === "restaurant" ? p.restaurant : p.default;
}

// Start of the current month in East Africa Time (UTC+3), as a UTC Date.
export function startOfMonthEAT(now = new Date()): Date {
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), 1) - 3 * 60 * 60 * 1000);
}
