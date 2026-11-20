import { db } from "@/config/db";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";
import { PLAN_LIMITS } from "./subscriptions.validation";
import { PLANS, PLAN_ORDER, PlanName, priceFor, startOfMonthEAT } from "./plans";

export async function getSubscription(tenantId: string) {
  const subscription = await db.subscription.findUnique({ where: { tenantId } });

  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }

  return subscription;
}

// Sets a business's plan. Called by the platform owner (super admin) once
// payment has been received — see setTenantPlanHandler in the superadmin
// module. When an M-Pesa/payment integration is added, its confirmation
// webhook should call this instead.
export async function setPlan(tenantId: string, plan: PlanName) {
  const existing = await db.subscription.findUnique({ where: { tenantId } });
  if (!existing) {
    throw new NotFoundError("Subscription not found");
  }

  const limits = PLAN_LIMITS[plan];
  // Paying again for the same plan before it runs out adds 30 days on top
  // of what's left, so an early payment isn't lost.
  const stillPaid =
    existing.plan === plan && existing.currentPeriodEnd && existing.currentPeriodEnd.getTime() > Date.now();
  const renewFrom = stillPaid ? existing.currentPeriodEnd!.getTime() : Date.now();
  return db.subscription.update({
    where: { tenantId },
    data: {
      plan,
      status: "ACTIVE",
      seatLimit: limits.seatLimit,
      productLimit: limits.productLimit,
      currentPeriodEnd: plan === "FREE" ? null : new Date(renewFrom + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

// What a business owner can do themselves. Paid plans cost money, so an
// owner can only move DOWN to Free here; moving up goes through the
// platform owner after payment (setPlan above).
export async function upgradePlan(tenantId: string, plan: PlanName) {
  if (plan !== "FREE") {
    throw new ForbiddenError(
      "To move to a paid plan, pay for it first — the plan is switched on for you once payment is received."
    );
  }
  return setPlan(tenantId, plan);
}

async function planFor(tenantId: string) {
  const sub = await db.subscription.findUnique({ where: { tenantId }, select: { plan: true } });
  return PLANS[(sub?.plan ?? "FREE") as PlanName];
}

// Products for a shop, menu items for a restaurant — the same plan limit.
export async function checkProductLimit(tenantId: string) {
  const plan = await planFor(tenantId);
  if (plan.products === null) return { limitReached: false };

  const currentCount = await db.product.count({ where: { tenantId, status: "ACTIVE" } });
  if (currentCount >= plan.products) {
    return { limitReached: true, limit: plan.products, plan: plan.label };
  }
  return { limitReached: false };
}

export async function checkMenuItemLimit(tenantId: string) {
  const plan = await planFor(tenantId);
  if (plan.products === null) return;

  const currentCount = await db.menuItem.count({ where: { tenantId, isActive: true } });
  if (currentCount >= plan.products) {
    throw new ForbiddenError(
      `You've reached your ${plan.label} plan's limit of ${plan.products} menu items. Upgrade your plan to add more.`
    );
  }
}

export async function checkStaffLimit(tenantId: string) {
  const plan = await planFor(tenantId);
  if (plan.staff === null) return;

  const currentCount = await db.user.count({ where: { tenantId, isActive: true } });
  if (currentCount >= plan.staff) {
    throw new ForbiddenError(
      `You've reached your ${plan.label} plan's limit of ${plan.staff} staff accounts. Upgrade your plan to add more.`
    );
  }
}

type Level = "ok" | "near" | "reached";
function level(used: number, limit: number | null): Level {
  if (limit === null) return "ok";
  if (used >= limit) return "reached";
  if (used >= limit * 0.8) return "near";
  return "ok";
}

// Everything the "Plan" page and the dashboard banner need in one call.
export async function getUsage(tenantId: string) {
  const [tenant, sub] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { industry: true } }),
    db.subscription.findUnique({ where: { tenantId } }),
  ]);
  if (!sub) throw new NotFoundError("Subscription not found");

  const industry = tenant?.industry ?? null;
  const isRestaurant = industry === "restaurant";
  const plan = PLANS[sub.plan as PlanName];
  const monthStart = startOfMonthEAT();

  const [items, staff, shopSales, restaurantOrders] = await Promise.all([
    isRestaurant
      ? db.menuItem.count({ where: { tenantId, isActive: true } })
      : db.product.count({ where: { tenantId, status: "ACTIVE" } }),
    db.user.count({ where: { tenantId, isActive: true } }),
    db.sale.count({ where: { tenantId, status: "COMPLETED", createdAt: { gte: monthStart } } }),
    db.order.count({ where: { tenantId, status: "COMPLETED", createdAt: { gte: monthStart } } }),
  ]);
  const sales = shopSales + restaurantOrders;

  return {
    plan: sub.plan,
    planLabel: plan.label,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    industry,
    monthStart,
    usage: {
      items: { label: isRestaurant ? "Menu items" : "Products", used: items, limit: plan.products, level: level(items, plan.products) },
      staff: { label: "Staff accounts", used: staff, limit: plan.staff, level: level(staff, plan.staff) },
      // Warning only — sales are never blocked.
      sales: { label: "Sales this month", used: sales, limit: plan.monthlySales, level: level(sales, plan.monthlySales) },
    },
    plans: PLAN_ORDER.map((name) => {
      const p = PLANS[name];
      return {
        name,
        label: p.label,
        priceTzs: priceFor(name, industry),
        items: p.products,
        staff: p.staff,
        monthlySales: p.monthlySales,
      };
    }),
  };
}
