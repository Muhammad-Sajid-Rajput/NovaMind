// NovaMind — backend/modules/utils/util.routes.js

import { Router } from "express";
import { generatePassword, getStatus } from "./util.controller.js";
import { validatePassword } from "./util.validator.js";
import { requireAuth } from "../../core/middleware/auth.js";

const router = Router();

router.post("/password", validatePassword, generatePassword);
router.get("/status", requireAuth, getStatus);

export default router;
