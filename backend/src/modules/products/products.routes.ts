import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import {
  createProductHandler,
  listProductsHandler,
  getProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from "./products.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("products.view"), listProductsHandler);
router.get("/:id", requirePermission("products.view"), getProductHandler);
router.post("/", requirePermission("products.manage"), createProductHandler);
router.put("/:id", requirePermission("products.manage"), updateProductHandler);
router.delete("/:id", requirePermission("products.manage"), deleteProductHandler);

export default router;