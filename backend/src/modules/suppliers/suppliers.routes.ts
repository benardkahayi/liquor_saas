import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  createSupplierHandler,
  listSuppliersHandler,
  getSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  recordPaymentHandler,
} from "./suppliers.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("suppliers.manage"), listSuppliersHandler);
router.get("/:id", requirePermission("suppliers.manage"), getSupplierHandler);
router.post("/", requirePermission("suppliers.manage"), createSupplierHandler);
router.put("/:id", requirePermission("suppliers.manage"), updateSupplierHandler);
router.delete("/:id", requirePermission("suppliers.manage"), deleteSupplierHandler);
router.post("/:id/payments", requirePermission("suppliers.manage"), recordPaymentHandler);

export default router;