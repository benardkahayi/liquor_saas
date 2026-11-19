import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { requirePermission } from "@/middleware/rbac";
import { getSubscriptionHandler, upgradePlanHandler } from "./subscriptions.controller";

const router = Router();

router.use(requireAuth, resolveTenant);

router.get("/", requirePermission("settings.manage"), getSubscriptionHandler);
router.put("/upgrade", requirePermission("settings.manage"), upgradePlanHandler);

export default router;
