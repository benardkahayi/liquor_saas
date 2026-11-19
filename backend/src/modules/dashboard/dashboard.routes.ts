import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  getSummaryHandler,
  getRestaurantSummaryHandler,
  getSalesOverTimeHandler,
  getTopProductsHandler,
  getSalesByPaymentMethodHandler,
} from "./dashboard.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/summary", requirePermission("reports.view"), getSummaryHandler);
router.get("/restaurant-summary", requirePermission("restaurant.reports.view"), getRestaurantSummaryHandler);
router.get("/charts/sales-over-time", requirePermission("reports.view"), getSalesOverTimeHandler);
router.get("/charts/top-products", requirePermission("reports.view"), getTopProductsHandler);
router.get(
  "/charts/payment-methods",
  requirePermission("reports.view"),
  getSalesByPaymentMethodHandler
);

export default router;