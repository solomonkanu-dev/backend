import multer from "multer";

const storage = multer.memoryStorage();

const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const documentMimeTypes = [
  ...imageMimeTypes,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const imageFilter = (req, file, cb) => {
  if (imageMimeTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed (jpeg, png, gif, webp)"), false);
};

const documentFilter = (req, file, cb) => {
  if (documentMimeTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only images and documents (PDF, DOC, DOCX) are allowed"), false);
};

// For profile photos and logos — images only, 5 MB
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

// For assignment submissions — images + documents, 10 MB
export const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

// Uniform multer error handler — use after the multer middleware
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Max 5 MB for images, 10 MB for documents." });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
};
