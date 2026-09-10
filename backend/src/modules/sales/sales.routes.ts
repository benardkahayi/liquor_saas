import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { createSaleHandler, listSalesHandler, getSaleHandler } from "./sales.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.post("/", requirePermission("sales.create"), createSaleHandler);
router.get("/", requirePermission("sales.list"), listSalesHandler);
router.get("/:id", requirePermission("sales.read"), getSaleHandler);

export default router;