import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError } from "@/common/errors/AppError";

interface UpdateSettingsInput {
  businessName?: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  currency?: string;
  primaryColor?: string;
  receiptFooter?: string;
  enabledModules?: string[];
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
  const { businessName, ...settingsFields } = input;

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (businessName) {
      await tx.tenant.update({ where: { id: tenantId }, data: { name: businessName } });
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