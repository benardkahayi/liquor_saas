import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/common/utils/jwt";
import { ConflictError, UnauthorizedError, NotFoundError } from "@/common/errors/AppError";

const DEFAULT_PERMISSIONS = [
  { key: "products.view", label: "View products" },
  { key: "products.manage", label: "Create/edit/delete products" },
  { key: "sales.create", label: "Create sales" },
  { key: "sales.void", label: "Void/refund sales" },
  { key: "inventory.manage", label: "Adjust inventory" },
  { key: "customers.view", label: "View customers" },
  { key: "customers.manage", label: "Manage customers" },
  { key: "suppliers.manage", label: "Manage suppliers" },
  { key: "expenses.manage", label: "Manage expenses" },
  { key: "reports.view", label: "View reports" },
  { key: "settings.manage", label: "Manage tenant settings" },
] as const;

interface RegisterInput {
  businessName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
}

export async function registerTenant(input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.ownerEmail } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const slug = input.businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const passwordHash = await hashPassword(input.ownerPassword);

  const result = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.businessName,
          slug,
          settings: { create: {} },
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

      const cashierPermKeys = ["products.view", "sales.create", "customers.view"];
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

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail,
          passwordHash,
          fullName: input.ownerFullName,
          roleId: ownerRole.id,
        },
      });

      return { tenant, owner };
    },
    { timeout: 15000 }
  );

  return issueTokens(result.owner.id, result.tenant.id, false, result.owner.roleId);
}

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return issueTokens(user.id, user.tenantId, user.isSuperAdmin, user.roleId);
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