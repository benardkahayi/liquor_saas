import { Router } from "express";
import { registerHandler, loginHandler, refreshHandler, logoutHandler } from "./auth.controller";

const router = Router();

// These are the unauthenticated endpoints in the API. Everything else sits
// behind the auth middleware. Logout doesn't need auth either — it just
// clears cookies, and calling it while already logged out is harmless.
router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);

export default router;
