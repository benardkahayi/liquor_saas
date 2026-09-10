import express from "express";
import cors from "cors";
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
import tenantsRoutes from "@/modules/tenants/tenants.routes";
import superAdminRoutes from "@/modules/superadmin/superadmin.routes";
import { errorHandler } from "@/middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

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
  app.use("/api/v1/tenants", tenantsRoutes);
  app.use("/api/v1/superadmin", superAdminRoutes);

  app.use(errorHandler);

  return app;
}