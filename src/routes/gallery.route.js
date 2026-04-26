import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import { uploadImages, handleMulterError } from '../middlewares/upload.js';
import {
  createAlbum,
  getAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
  uploadPhotos,
  deletePhoto,
} from '../controllers/gallery.controller.js';

const router = Router();

// All authenticated roles can view published albums
router.get('/albums', auth, getAlbums);
router.get('/albums/:albumId', auth, getAlbum);

// Admin only — album management
router.post('/albums', auth, adminOnly, createAlbum);
router.patch('/albums/:albumId', auth, adminOnly, updateAlbum);
router.delete('/albums/:albumId', auth, adminOnly, deleteAlbum);

// Admin only — photo upload / delete
router.post('/albums/:albumId/photos', auth, adminOnly, uploadImages, handleMulterError, uploadPhotos);
router.delete('/photos/:photoId', auth, adminOnly, deletePhoto);

export default router;
