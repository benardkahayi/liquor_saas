import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { getSettingsHandler, updateSettingsHandler } from "./tenants.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/settings", requirePermission("settings.manage"), getSettingsHandler);
router.put("/settings", requirePermission("settings.manage"), updateSettingsHandler);

export default router;