import { db } from "@/config/db";
import { NotFoundError } from "@/common/errors/AppError";
import { PLAN_LIMITS } from "./subscriptions.validation";

export async function getSubscription(tenantId: string) {
  const subscription = await db.subscription.findUnique({ where: { tenantId } });

  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }

  return subscription;
}

export async function upgradePlan(tenantId: string, plan: "FREE" | "STARTER" | "PRO") {
  const existing = await db.subscription.findUnique({ where: { tenantId } });
  if (!existing) {
    throw new NotFoundError("Subscription not found");
  }

  const limits = PLAN_LIMITS[plan];

  // ============================================================
  // PAYMENT INTEGRATION SEAM — read before connecting a real processor
  // ============================================================
  // In production this function should only run AFTER a payment
  // processor (Stripe, etc.) confirms a successful charge, typically via
  // a webhook. Right now it changes the plan directly — fine for a
  // free/demo tier, but must not ship to paying customers as-is.
  //
  // Future shape:
  //   1. Frontend calls POST /billing/checkout -> creates a Stripe
  //      Checkout Session, returns its URL.
  //   2. User pays on Stripe's hosted page.
  //   3. Stripe calls our webhook (POST /billing/webhook) confirming payment.
  //   4. ONLY THEN call this upgradePlan() function.
  // ============================================================

  return db.subscription.update({
    where: { tenantId },
    data: {
      plan,
      status: "ACTIVE",
      seatLimit: limits.seatLimit,
      productLimit: limits.productLimit,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function checkProductLimit(tenantId: string) {
  const subscription = await db.subscription.findUnique({ where: { tenantId } });
  if (!subscription) return { limitReached: false };

  const currentCount = await db.product.count({
    where: { tenantId, status: "ACTIVE" },
  });

  if (currentCount >= subscription.productLimit) {
    return {
      limitReached: true,
      limit: subscription.productLimit,
      plan: subscription.plan,
    };
  }

  return { limitReached: false };
}