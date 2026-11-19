import { z } from "zod";
import { PLANS } from "./plans";

// Kept for older imports; the numbers now come from plans.ts.
// (100000 stands in for "unlimited" in the stored columns.)
const stored = (n: number | null) => (n === null ? 100000 : n);
export const PLAN_LIMITS = {
  FREE: { productLimit: stored(PLANS.FREE.products), seatLimit: stored(PLANS.FREE.staff) },
  STARTER: { productLimit: stored(PLANS.STARTER.products), seatLimit: stored(PLANS.STARTER.staff) },
  PRO: { productLimit: stored(PLANS.PRO.products), seatLimit: stored(PLANS.PRO.staff) },
} as const;

export const upgradePlanSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO"]),
});
