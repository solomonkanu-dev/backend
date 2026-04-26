import mongoose from 'mongoose';

const galleryAlbumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    eventDate: { type: Date, default: null },
    isPublished: { type: Boolean, default: false },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

galleryAlbumSchema.index({ institute: 1, isPublished: 1, createdAt: -1 });

export default mongoose.model('GalleryAlbum', galleryAlbumSchema);
