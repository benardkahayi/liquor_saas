import { Router } from "express";
import { registerHandler, loginHandler, refreshHandler } from "./auth.controller";

const router = Router();

// These three routes are intentionally the ONLY unauthenticated endpoints
// in the whole API. Everything else will sit behind the auth middleware
// we build in the next step.
router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);

export default router;