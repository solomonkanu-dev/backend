import mongoose from 'mongoose';

const galleryPhotoSchema = new mongoose.Schema(
  {
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'GalleryAlbum', required: true, index: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String, default: '' },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

galleryPhotoSchema.index({ album: 1, createdAt: 1 });

export default mongoose.model('GalleryPhoto', galleryPhotoSchema);
