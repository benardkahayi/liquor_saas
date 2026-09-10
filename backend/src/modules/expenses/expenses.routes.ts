import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  createExpenseHandler,
  listExpensesHandler,
  getExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
} from "./expenses.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("expenses.manage"), listExpensesHandler);
router.get("/:id", requirePermission("expenses.manage"), getExpenseHandler);
router.post("/", requirePermission("expenses.manage"), createExpenseHandler);
router.put("/:id", requirePermission("expenses.manage"), updateExpenseHandler);
router.delete("/:id", requirePermission("expenses.manage"), deleteExpenseHandler);

export default router;