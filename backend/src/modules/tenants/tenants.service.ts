import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";

interface UpdateSettingsInput {
  businessName?: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  currency?: string;
  primaryColor?: string;
  receiptFooter?: string;
  enabledModules?: string[];
  industry?: string;
}

// Public — used by the frontend to know what to render on a tenant
// subdomain BEFORE the visitor is logged in (branding, or "business not
// found" / "suspended" states). Deliberately returns only non-sensitive
// fields — no id, no settings, nothing a stranger shouldn't see.
export async function getPublicTenantBySlug(slug: string) {
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { name: true, status: true, settings: { select: { logoUrl: true, primaryColor: true } } },
  });

  if (!tenant) {
    throw new NotFoundError("Business not found");
  }

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    throw new ForbiddenError("This business account has been suspended. Contact support.");
  }

  return tenant;
}

// For every logged-in staff member (cashiers included): what the app needs
// to draw the right screens — name, business type, branding. Settings
// that only the owner edits stay behind GET /settings.
export async function getCurrentTenant(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      status: true,
      settings: {
        select: {
          logoUrl: true,
          phone: true,
          address: true,
          currency: true,
          primaryColor: true,
          receiptFooter: true,
          enabledModules: true,
        },
      },
      subscription: {
        select: { plan: true, status: true, seatLimit: true, productLimit: true, currentPeriodEnd: true },
      },
    },
  });
  if (!tenant) {
    throw new NotFoundError("Tenant not found");
  }
  return tenant;
}

export async function getSettings(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true, subscription: true },
  });

  if (!tenant) {
    throw new NotFoundError("Tenant not found");
  }

  return tenant;
}

export async function updateSettings(tenantId: string, input: UpdateSettingsInput) {
  const { businessName, industry, ...settingsFields } = input;

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (businessName || industry) {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { ...(businessName && { name: businessName }), ...(industry && { industry }) },
      });
    }

    const hasSettingsFields = Object.keys(settingsFields).length > 0;
    if (hasSettingsFields) {
      await tx.tenantSettings.update({
        where: { tenantId },
        data: settingsFields,
      });
    }

    return tx.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true },
    });
  });
}