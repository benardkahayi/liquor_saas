import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  createCustomerHandler,
  listCustomersHandler,
  getCustomerHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
} from "./customers.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("customers.view"), listCustomersHandler);
router.get("/:id", requirePermission("customers.view"), getCustomerHandler);
router.post("/", requirePermission("customers.manage"), createCustomerHandler);
router.put("/:id", requirePermission("customers.manage"), updateCustomerHandler);
router.delete("/:id", requirePermission("customers.manage"), deleteCustomerHandler);

export default router;