import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { getSettingsHandler, updateSettingsHandler, getPublicBySlugHandler, getCurrentHandler } from "./tenants.controller";

const router = Router();

// Public — no auth. Must be registered before the router.use() below.
router.get("/by-slug/:slug", getPublicBySlugHandler);

router.use(requireAuth, resolveTenant);

// Any staff member — the app needs the business type to show the right menu.
router.get("/current", getCurrentHandler);
router.get("/settings", requirePermission("settings.manage"), getSettingsHandler);
router.put("/settings", requirePermission("settings.manage"), updateSettingsHandler);

export default router;
