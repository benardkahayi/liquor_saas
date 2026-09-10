import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  getLowStockReportHandler,
  getInventoryValuationHandler,
  getSalesReportHandler,
  getExpensesByCategoryHandler,
} from "./reports.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/low-stock", requirePermission("reports.view"), getLowStockReportHandler);
router.get(
  "/inventory-valuation",
  requirePermission("reports.view"),
  getInventoryValuationHandler
);
router.get("/sales", requirePermission("reports.view"), getSalesReportHandler);
router.get(
  "/expenses-by-category",
  requirePermission("reports.view"),
  getExpensesByCategoryHandler
);

export default router;