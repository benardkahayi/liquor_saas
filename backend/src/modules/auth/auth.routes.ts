import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "./auth.controller";
import {
  loginIpLimit,
  loginEmailLimit,
  registerLimit,
  forgotPasswordLimit,
  resetPasswordLimit,
  refreshLimit,
} from "@/middleware/rateLimits";

const router = Router();

// These are the unauthenticated endpoints in the API. Everything else sits
// behind the auth middleware. Logout doesn't need auth either — it just
// clears cookies, and calling it while already logged out is harmless.
router.post("/register", registerLimit, registerHandler);
router.post("/login", loginIpLimit, loginEmailLimit, loginHandler);
router.post("/refresh", refreshLimit, refreshHandler);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotPasswordLimit, forgotPasswordHandler);
router.post("/reset-password", resetPasswordLimit, resetPasswordHandler);

export default router;
