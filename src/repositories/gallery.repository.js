import GalleryAlbum from '../models/GalleryAlbum.js';
import GalleryPhoto from '../models/GalleryPhoto.js';

// ─── Albums ──────────────────────────────────────────────────────────────────

export const createAlbum = (data) => GalleryAlbum.create(data);

export const findAlbums = (filter) =>
  GalleryAlbum.find(filter).sort({ createdAt: -1 }).lean();

export const findAlbumById = (id) => GalleryAlbum.findById(id).lean();

export const updateAlbum = (id, update) =>
  GalleryAlbum.findByIdAndUpdate(id, update, { new: true }).lean();

export const deleteAlbum = (id) => GalleryAlbum.findByIdAndDelete(id);

// ─── Photos ───────────────────────────────────────────────────────────────────

export const createPhoto = (data) => GalleryPhoto.create(data);

export const findPhotosByAlbum = (albumId) =>
  GalleryPhoto.find({ album: albumId }).sort({ createdAt: 1 }).lean();

export const findPhotoById = (id) => GalleryPhoto.findById(id).lean();

export const deletePhoto = (id) => GalleryPhoto.findByIdAndDelete(id);

export const countPhotosByAlbum = (albumId) =>
  GalleryPhoto.countDocuments({ album: albumId });

export const findFirstPhoto = (albumId) =>
  GalleryPhoto.findOne({ album: albumId }).sort({ createdAt: 1 }).lean();

export const deletePhotosByAlbum = (albumId) =>
  GalleryPhoto.deleteMany({ album: albumId });

export const findPhotosByAlbums = (albumIds) =>
  GalleryPhoto.find({ album: { $in: albumIds } }).lean();

// Aggregate photo counts for a list of album ids
export const aggregatePhotoCounts = (albumIds) =>
  GalleryPhoto.aggregate([
    { $match: { album: { $in: albumIds } } },
    { $group: { _id: '$album', count: { $sum: 1 } } },
  ]);
