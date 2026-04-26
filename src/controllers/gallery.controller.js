import * as galleryService from '../services/gallery.service.js';

export const createAlbum = async (req, res, next) => {
  try {
    const album = await galleryService.createAlbum(req.body, req.user);
    res.status(201).json({ data: album });
  } catch (err) {
    next(err);
  }
};

export const getAlbums = async (req, res, next) => {
  try {
    const albums = await galleryService.getAlbums(req.user);
    res.json({ data: albums });
  } catch (err) {
    next(err);
  }
};

export const getAlbum = async (req, res, next) => {
  try {
    const result = await galleryService.getAlbum(req.params.albumId, req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const updateAlbum = async (req, res, next) => {
  try {
    const album = await galleryService.updateAlbum(req.params.albumId, req.body, req.user);
    res.json({ data: album });
  } catch (err) {
    next(err);
  }
};

export const deleteAlbum = async (req, res, next) => {
  try {
    await galleryService.deleteAlbum(req.params.albumId, req.user);
    res.json({ message: 'Album deleted' });
  } catch (err) {
    next(err);
  }
};

export const uploadPhotos = async (req, res, next) => {
  try {
    const photos = await galleryService.uploadPhotos(req.params.albumId, req.files, req.user);
    res.status(201).json({ data: photos });
  } catch (err) {
    next(err);
  }
};

export const deletePhoto = async (req, res, next) => {
  try {
    await galleryService.deletePhoto(req.params.photoId, req.user);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
};
