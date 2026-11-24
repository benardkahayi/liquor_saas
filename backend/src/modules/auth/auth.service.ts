import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/common/utils/jwt";
import { generateUniqueSlug } from "@/common/utils/slug";
import { ConflictError, UnauthorizedError, NotFoundError } from "@/common/errors/AppError";
import { notifyNewBusiness } from "@/modules/superadmin/notifications";

const DEFAULT_PERMISSIONS = [
  { key: "products.view", label: "View products" },
  { key: "products.manage", label: "Create/edit/delete products" },
  { key: "sales.create", label: "Create sales" },
  { key: "sales.void", label: "Void/refund sales" },
  { key: "sales.list", label: "View sales history" },
  { key: "sales.read", label: "View a single sale" },
  { key: "inventory.manage", label: "Adjust inventory" },
  { key: "customers.view", label: "View customers" },
  { key: "customers.manage", label: "Manage customers" },
  { key: "suppliers.manage", label: "Manage suppliers" },
  { key: "expenses.manage", label: "Manage expenses" },
  { key: "reports.view", label: "View reports" },
  { key: "settings.manage", label: "Manage tenant settings" },
  { key: "restaurant.menu.manage", label: "Manage restaurant menu" },
  { key: "restaurant.orders.create", label: "Create restaurant orders" },
  { key: "restaurant.orders.view", label: "View restaurant orders" },
  { key: "restaurant.payments.record", label: "Record restaurant payments" },
  { key: "restaurant.tables.manage", label: "Manage restaurant tables" },
  { key: "restaurant.customers.manage", label: "Manage restaurant customers" },
  { key: "restaurant.expenses.record", label: "Record restaurant expenses" },
  { key: "restaurant.reports.view", label: "View restaurant reports" },
  { key: "restaurant.employees.manage", label: "Manage restaurant employees" },
] as const;

interface RegisterInput {
  businessName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
  ownerFullName: string;
  industry?: string;
}

export async function registerTenant(input: RegisterInput) {
  const existing = await db.user.findFirst({
    where: { email: { equals: input.ownerEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const slug = await generateUniqueSlug(input.businessName);
  const passwordHash = await hashPassword(input.ownerPassword);

  const result = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.businessName,
          slug,
          ...(input.industry && { industry: input.industry }),
          settings: { create: { phone: input.ownerPhone } },
          subscription: { create: {} },
        },
      });

      await tx.permission.createMany({
        data: DEFAULT_PERMISSIONS.map((p) => ({ key: p.key, label: p.label })),
        skipDuplicates: true,
      });
      const allPermissions = await tx.permission.findMany();

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Owner",
          isSystem: true,
          permissions: {
            create: allPermissions.map((p: { id: string }) => ({ permissionId: p.id })),
          },
        },
      });

      const cashierPermKeys = [
        "products.view",
        "sales.create",
        "customers.view",
        // Restaurant counter: take orders, receive payments, see debts/daybook
        "restaurant.orders.create",
        "restaurant.orders.view",
        "restaurant.payments.record",
      ];
      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Cashier",
          isSystem: true,
          permissions: {
            create: allPermissions
              .filter((p: { key: string }) => cashierPermKeys.includes(p.key))
              .map((p: { id: string }) => ({ permissionId: p.id })),
          },
        },
      });

      const managerPermKeys = [
        "products.view",
        "products.manage",
        "sales.create",
        "sales.list",
        "sales.read",
        "customers.view",
        "customers.manage",
        "expenses.manage",
        "reports.view",
        "restaurant.menu.manage",
        "restaurant.orders.create",
        "restaurant.orders.view",
        "restaurant.payments.record",
        "restaurant.tables.manage",
        "restaurant.customers.manage",
        "restaurant.expenses.record",
        "restaurant.reports.view",
      ];
      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Manager",
          isSystem: true,
          permissions: {
            create: allPermissions
              .filter((p: { key: string }) => managerPermKeys.includes(p.key))
              .map((p: { id: string }) => ({ permissionId: p.id })),
          },
        },
      });

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail,
          passwordHash,
          fullName: input.ownerFullName,
          roleId: ownerRole.id,
          lastActiveAt: new Date(),
        },
      });

      return { tenant, owner };
    },
    { timeout: 15000 }
  );

  // Tell the platform admin a new business has joined (in the background;
  // a slow or failed email never holds up the sign-up).
  void notifyNewBusiness({
    tenantId: result.tenant.id,
    businessName: result.tenant.name,
    industry: result.tenant.industry,
    ownerName: input.ownerFullName,
    ownerEmail: input.ownerEmail,
    ownerPhone: input.ownerPhone,
  });

  return {
    ...issueTokens(result.owner.id, result.tenant.id, false, result.owner.roleId),
    tenantSlug: result.tenant.slug,
  };
}

// Made once at startup, with the same cost as real passwords.
const dummy: Promise<string> = hashPassword("not-a-real-password-" + Math.random());
function dummyHash() {
  return dummy;
}

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  // Emails match whatever their capitals: Asha@Gmail.com = asha@gmail.com.
  const user = await db.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    include: { tenant: { select: { slug: true } } },
  });

  // Check a password even when there's no such account, so a wrong email
  // takes as long as a wrong password and can't reveal who is registered.
  const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !user.isActive || !passwordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  return {
    ...issueTokens(user.id, user.tenantId, user.isSuperAdmin, user.roleId),
    tenantSlug: user.tenant?.slug ?? null,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    throw new NotFoundError("User no longer exists");
  }

  // A password reset logs out every device that signed in before it.
  const issuedAtMs = ((payload as { iat?: number }).iat ?? 0) * 1000;
  if (user.passwordChangedAt && issuedAtMs < user.passwordChangedAt.getTime() - 1000) {
    throw new UnauthorizedError("Your password was changed. Please sign in again.");
  }

  // The app renews its sign-in about every 15 minutes while in use, so this
  // keeps "last active" current. At most one write per 10 minutes.
  if (!user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 10 * 60 * 1000) {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }

  const accessToken = signAccessToken({
    userId: user.id,
    tenantId: user.tenantId,
    isSuperAdmin: user.isSuperAdmin,
    roleId: user.roleId,
  });

  return { accessToken };
}

function issueTokens(
  userId: string,
  tenantId: string | null,
  isSuperAdmin: boolean,
  roleId: string | null
) {
  const accessToken = signAccessToken({ userId, tenantId, isSuperAdmin, roleId });
  const refreshToken = signRefreshToken({ userId });
  return { accessToken, refreshToken };
}
