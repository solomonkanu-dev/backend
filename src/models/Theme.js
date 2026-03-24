import mongoose from 'mongoose';

const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    primary: {
      type: String,
      default: '#007bff', // Bootstrap primary blue
      match: /^#[0-9A-F]{6}$/i,
    },
    secondary: {
      type: String,
      default: '#6c757d', // Bootstrap secondary gray
      match: /^#[0-9A-F]{6}$/i,
    },
    accent: {
      type: String,
      default: '#ffc107', // Bootstrap warning yellow
      match: /^#[0-9A-F]{6}$/i,
    },
    success: {
      type: String,
      default: '#28a745',
      match: /^#[0-9A-F]{6}$/i,
    },
    danger: {
      type: String,
      default: '#dc3545',
      match: /^#[0-9A-F]{6}$/i,
    },
    warning: {
      type: String,
      default: '#ffc107',
      match: /^#[0-9A-F]{6}$/i,
    },
    info: {
      type: String,
      default: '#17a2b8',
      match: /^#[0-9A-F]{6}$/i,
    },
    dark: {
      type: String,
      default: '#343a40',
      match: /^#[0-9A-F]{6}$/i,
    },
    light: {
      type: String,
      default: '#f8f9fa',
      match: /^#[0-9A-F]{6}$/i,
    },
    fontFamily: {
      type: String,
      default: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    },
    fontSize: {
      type: Number,
      default: 14,
      min: 10,
      max: 20,
    },
    logo: {
      type: String, // URL or file path
      trim: true,
    },
    favicon: {
      type: String, // URL or file path
      trim: true,
    },
    backgroundImage: {
      type: String, // URL or file path
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Ensure only one active theme per institute
themeSchema.index({ institute: 1, isActive: 1 });

export default mongoose.model('Theme', themeSchema);
