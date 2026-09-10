import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { requireSuperAdmin } from "@/middleware/superAdmin";
import {
  listTenantsHandler,
  getTenantHandler,
  updateTenantStatusHandler,
  getPlatformStatsHandler,
} from "./superadmin.controller";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.get("/stats", getPlatformStatsHandler);
router.get("/tenants", listTenantsHandler);
router.get("/tenants/:id", getTenantHandler);
router.put("/tenants/:id/status", updateTenantStatusHandler);

export default router;