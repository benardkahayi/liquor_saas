import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  getSummaryHandler,
  getSalesOverTimeHandler,
  getTopProductsHandler,
  getSalesByPaymentMethodHandler,
} from "./dashboard.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/summary", requirePermission("reports.view"), getSummaryHandler);
router.get("/charts/sales-over-time", requirePermission("reports.view"), getSalesOverTimeHandler);
router.get("/charts/top-products", requirePermission("reports.view"), getTopProductsHandler);
router.get(
  "/charts/payment-methods",
  requirePermission("reports.view"),
  getSalesByPaymentMethodHandler
);

export default router;