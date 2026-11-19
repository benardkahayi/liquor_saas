import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { getSubscriptionHandler, getUsageHandler, upgradePlanHandler } from "./subscriptions.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("settings.manage"), getSubscriptionHandler);
router.get("/usage", requirePermission("settings.manage"), getUsageHandler);
router.put("/upgrade", requirePermission("settings.manage"), upgradePlanHandler);

export default router;
