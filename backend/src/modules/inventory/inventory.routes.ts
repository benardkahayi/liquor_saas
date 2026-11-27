import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  createAdjustmentHandler,
  listHistoryHandler,
  stockInHandler,
  listStockInsHandler,
  importStockHandler,
} from "./inventory.controller";

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

router.post("/stock-in", requirePermission("inventory.manage"), stockInHandler);
router.get("/stock-in", requirePermission("products.view"), listStockInsHandler);
router.post("/import", requirePermission("inventory.manage"), importStockHandler);

export default router;