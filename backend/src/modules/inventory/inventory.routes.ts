import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { createAdjustmentHandler, listHistoryHandler } from "./inventory.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.post(
  "/adjustments",
  requirePermission("inventory.manage"),
  createAdjustmentHandler
);

router.get(
  "/products/:productId/history",
  requirePermission("products.view"),
  listHistoryHandler
);

export default router;