// NovaMind — backend/modules/utils/util.routes.js

import { Router } from "express";
import { generatePassword, getStatus } from "./util.controller.js";
import { validatePassword } from "./util.validator.js";

const router = Router();

router.post("/password", validatePassword, generatePassword);
router.get("/status", getStatus);

export default router;
