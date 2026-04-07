import { Router } from "express";
import { getCalendarEvents } from "../controllers/calendar.controller.js";
import auth from "../middlewares/auth.js";

const router = Router();

router.get("/", auth, getCalendarEvents);

export default router;
