import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { requireSuperAdmin } from "@/middleware/superAdmin";
import {
  listTenantsHandler,
  getTenantHandler,
  updateTenantStatusHandler,
  getPlatformStatsHandler,
  setTenantPlanHandler,
  listSubscriptionsHandler,
  listUsersHandler,
  updateUserStatusHandler,
} from "./superadmin.controller";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.get("/stats", getPlatformStatsHandler);
router.get("/tenants", listTenantsHandler);
router.get("/tenants/:id", getTenantHandler);
router.put("/tenants/:id/status", updateTenantStatusHandler);
router.put("/tenants/:id/plan", setTenantPlanHandler);
router.get("/subscriptions", listSubscriptionsHandler);
router.get("/users", listUsersHandler);
router.put("/users/:id/status", updateUserStatusHandler);

export default router;