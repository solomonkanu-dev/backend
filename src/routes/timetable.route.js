import { Router } from "express";
import { getTimetableByClass, getAllTimetables } from "../controllers/timetable.controller.js";
import auth from "../middlewares/auth.js";

const router = Router();

router.get("/class/:classId", auth, getTimetableByClass);
router.get("/", auth, getAllTimetables);

export default router;
