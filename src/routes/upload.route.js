import { Router } from "express";
import {
  uploadProfilePhoto,
  getProfilePhoto,
  uploadInstituteLogo,
  uploadAssignmentFile,
} from "../controllers/upload.controller.js";
import auth from "../middlewares/auth.js";
import { uploadImage, uploadDocument, handleMulterError } from "../middlewares/upload.js";

const router = Router();

// Profile photo — any authenticated user
router.post("/profile-photo", auth, uploadImage, handleMulterError, uploadProfilePhoto);
router.get("/profile-photo", auth, getProfilePhoto);

// Institute logo — admin only
router.post("/institute-logo", auth, uploadImage, handleMulterError, uploadInstituteLogo);

// Assignment file — student only (returns URL to use when submitting assignment)
router.post("/assignment-file", auth, uploadDocument, handleMulterError, uploadAssignmentFile);

export default router;
