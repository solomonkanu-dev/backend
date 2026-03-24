import {Router} from "express";
import { getProfilePhoto, uploadProfilePhoto } from "../controllers/upload.controller.js";
import authMiddleware from "../middlewares/auth.js";
import multer from "multer";

const router = Router()

const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post(
  "/profile-photo",
  authMiddleware,
  upload.single("profilePhoto"),
  uploadProfilePhoto
);

router.get("/profile-photo", authMiddleware, getProfilePhoto);



export default router;
