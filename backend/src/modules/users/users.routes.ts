import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { resolveTenant } from "@/middleware/tenant";
import { db } from "@/config/db";

const router = Router();

router.get("/me", requireAuth, resolveTenant, async (req, res, next) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isSuperAdmin: true,
        tenantId: true,
        role: { select: { name: true } },
      },
    });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;