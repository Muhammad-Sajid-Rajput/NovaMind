// NovaMind — backend/modules/utils/util.routes.js

import { Router } from "express";
import { generatePassword, getStatus, getModelsStatus } from "./util.controller.js";
import { validatePassword } from "./util.validator.js";
import { requireAuth } from "../../core/middleware/auth.js";

const router = Router();

router.post("/password", validatePassword, generatePassword);
router.get("/status", requireAuth, getStatus);
router.get("/models/status", requireAuth, getModelsStatus);

export default router;

