import mongoose from 'mongoose';
import cloudinary, { uploadToCloudinary } from '../config/cloudinary.js';
import * as repo from '../repositories/gallery.repository.js';
import { AppError } from '../errors/AppError.js';

const instituteId = (user) => user.institute?._id ?? user.institute;

// ─── Albums ──────────────────────────────────────────────────────────────────

export const createAlbum = async (payload, user) => {
  const album = await repo.createAlbum({
    title: payload.title,
    description: payload.description ?? '',
    eventDate: payload.eventDate ?? null,
    isPublished: payload.isPublished ?? false,
    institute: instituteId(user),
    createdBy: user._id,
  });
  return { ...album, photoCount: 0 };
};

export const getAlbums = async (user) => {
  const filter = { institute: instituteId(user) };
  if (user.role !== 'admin') filter.isPublished = true;

  const albums = await repo.findAlbums(filter);
  if (!albums.length) return [];

  const albumIds = albums.map((a) => new mongoose.Types.ObjectId(a._id));
  const counts = await repo.aggregatePhotoCounts(albumIds);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  return albums.map((a) => ({ ...a, photoCount: countMap[String(a._id)] ?? 0 }));
};

export const getAlbum = async (albumId, user) => {
  const album = await repo.findAlbumById(albumId);
  if (!album) throw new AppError('Album not found', 404);

  if (!album.isPublished && user.role !== 'admin') {
    throw new AppError('This album is not published', 403);
  }

  const photos = await repo.findPhotosByAlbum(albumId);
  return { album: { ...album, photoCount: photos.length }, photos };
};

export const updateAlbum = async (albumId, payload, user) => {
  const album = await repo.findAlbumById(albumId);
  if (!album) throw new AppError('Album not found', 404);
  if (String(album.institute) !== String(instituteId(user))) {
    throw new AppError('Access denied', 403);
  }

  const allowed = ['title', 'description', 'eventDate', 'isPublished', 'coverImage'];
  const update = {};
  for (const key of allowed) {
    if (key in payload) update[key] = payload[key];
  }

  return repo.updateAlbum(albumId, update);
};

export const deleteAlbum = async (albumId, user) => {
  const album = await repo.findAlbumById(albumId);
  if (!album) throw new AppError('Album not found', 404);
  if (String(album.institute) !== String(instituteId(user))) {
    throw new AppError('Access denied', 403);
  }

  // Delete all photos from Cloudinary first
  const photos = await repo.findPhotosByAlbum(albumId);
  await Promise.allSettled(photos.map((p) => cloudinary.uploader.destroy(p.publicId)));

  await repo.deletePhotosByAlbum(albumId);
  await repo.deleteAlbum(albumId);
};

// ─── Photos ───────────────────────────────────────────────────────────────────

export const uploadPhotos = async (albumId, files, user) => {
  const album = await repo.findAlbumById(albumId);
  if (!album) throw new AppError('Album not found', 404);
  if (String(album.institute) !== String(instituteId(user))) {
    throw new AppError('Access denied', 403);
  }
  if (!files || files.length === 0) throw new AppError('No files provided', 400);

  const institute = instituteId(user);

  // Upload all files to Cloudinary in parallel for maximum speed
  const uploadedPhotos = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, {
        folder: 'gallery_images',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      return repo.createPhoto({
        album: albumId,
        url: result.secure_url,
        publicId: result.public_id,
        institute,
        uploadedBy: user._id,
      });
    })
  );

  // Set cover image if album doesn't have one yet
  if (!album.coverImage && uploadedPhotos.length > 0) {
    await repo.updateAlbum(albumId, { coverImage: uploadedPhotos[0].url });
  }

  return uploadedPhotos;
};

export const deletePhoto = async (photoId, user) => {
  const photo = await repo.findPhotoById(photoId);
  if (!photo) throw new AppError('Photo not found', 404);

  const album = await repo.findAlbumById(photo.album);
  if (!album) throw new AppError('Album not found', 404);
  if (String(album.institute) !== String(instituteId(user))) {
    throw new AppError('Access denied', 403);
  }

  // Remove from Cloudinary
  await cloudinary.uploader.destroy(photo.publicId);
  await repo.deletePhoto(photoId);

  // If this was the album's cover image, set next photo as cover
  if (album.coverImage === photo.url) {
    const next = await repo.findFirstPhoto(photo.album);
    await repo.updateAlbum(photo.album, { coverImage: next?.url ?? '' });
  }
};
