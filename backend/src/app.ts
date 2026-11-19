import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "@/modules/auth/auth.routes";
import usersRoutes from "@/modules/users/users.routes";
import productsRoutes from "@/modules/products/products.routes";
import inventoryRoutes from "@/modules/inventory/inventory.routes";
import salesRoutes from "@/modules/sales/sales.routes";
import customersRoutes from "@/modules/customers/customers.routes";
import suppliersRoutes from "@/modules/suppliers/suppliers.routes";
import expensesRoutes from "@/modules/expenses/expenses.routes";
import dashboardRoutes from "@/modules/dashboard/dashboard.routes";
import reportsRoutes from "@/modules/reports/reports.routes";
import restaurantRoutes from "@/modules/restaurant/restaurant.routes";
import tenantsRoutes from "@/modules/tenants/tenants.routes";
import superAdminRoutes from "@/modules/superadmin/superadmin.routes";
import { errorHandler } from "@/middleware/errorHandler";
import subscriptionsRoutes from "@/modules/subscriptions/subscriptions.routes";
import { resolveSubdomainTenant } from "@/middleware/subdomainTenant";
import { buildCorsOriginValidator } from "@/config/cors";

export function createApp() {
  const app = express();

  app.use(cors({ origin: buildCorsOriginValidator(), credentials: true }));
  // 1 MB leaves room for a resized menu photo (sent as base64) — the
  // default 100 KB limit would reject it.
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Runs before auth so an unauthenticated visitor to a dead/suspended
  // tenant subdomain still gets a clean "business not found"/"suspended"
  // response instead of a generic 401 from requireAuth further down.
  app.use(resolveSubdomainTenant);

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/products", productsRoutes);
  app.use("/api/v1/inventory", inventoryRoutes);
  app.use("/api/v1/sales", salesRoutes);
  app.use("/api/v1/customers", customersRoutes);
  app.use("/api/v1/suppliers", suppliersRoutes);
  app.use("/api/v1/expenses", expensesRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/reports", reportsRoutes);
  app.use("/api/v1/restaurant", restaurantRoutes);
  app.use("/api/v1/tenants", tenantsRoutes);
  app.use("/api/v1/superadmin", superAdminRoutes);
  app.use("/api/v1/subscriptions", subscriptionsRoutes);
  app.use(errorHandler);

  return app;
}
