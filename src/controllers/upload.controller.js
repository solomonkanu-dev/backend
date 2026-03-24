import User from "../models/user.js";
import cloudinary from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const profilePhoto = req.file;

  try {
    if (!profilePhoto) {
      return res.status(400).json({ error: "File not found" });
    }

    // Upload to cloudinary - changed folder name to blog_images
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.v2.uploader
        .upload_stream(
          {
            folder: "profile_images",
            transformation: [
              { width: 1200, height: 630, crop: "limit" }, // Optimize size
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        )
        .end(profilePhoto.buffer);
    });

    // Update user with profile photo URL
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: uploadResult.secure_url },
      { new: true }
    );

    // Fixed: Changed status code from 201 to 404 for user not found
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile photo uploaded successfully",
      profilePhoto: uploadResult.secure_url,
      user,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res.status(500).json({
      message: "Error uploading profile photo",
      error: error.message,
    });
  }
};

export const getProfilePhoto = async (req, res) => {
  const userId = req.user?.id || req.user?._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profilePhoto) {
      return res.status(404).json({ message: "Profile photo not found" });
    }

    // Fixed: For public URLs from Cloudinary, you don't need signed URLs
    // If the image is already uploaded with secure_url, just return it
    // Only use signed URLs if you uploaded as 'authenticated' type

    // Option 1: Return the secure URL directly (recommended for public images)
    res.status(200).json({ profilePhoto: user.profilePhoto });

    // Option 2: If you need signed URL for private images, use this instead:
    /*
    const publicId = user.profilePhoto.split('/').slice(-2).join('/').split('.')[0];
    
    const signedUrl = cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      transformation: [
        { fetch_format: "auto", quality: "auto" }
      ],
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
    });

    res.status(200).json({ profilePhoto: signedUrl });
    */
  } catch (error) {
    console.error("Error retrieving profile photo:", error);
    res.status(500).json({
      message: "Error retrieving profile photo",
      error: error.message,
    });
  }
};
