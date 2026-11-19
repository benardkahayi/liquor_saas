import { z } from "zod";

export const PLAN_LIMITS = {
  FREE: { productLimit: 20, seatLimit: 2 },
  STARTER: { productLimit: 200, seatLimit: 5 },
  PRO: { productLimit: 100000, seatLimit: 50 },
} as const;

export const upgradePlanSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO"]),
});