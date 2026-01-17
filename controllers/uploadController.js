// server/controllers/uploadController.js
import cloudinary from "../config/cloudinary.js";

/* ───────── UPLOAD IMAGE ───────── */
export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image)
      return res.status(400).json({ message: "No image provided" });

    const result = await cloudinary.uploader.upload(image, {
      folder: "products",
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });

  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Image upload failed" });
  }
};

/* ───────── DELETE IMAGE ───────── */
export const deleteImage = async (req, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id)
      return res.status(400).json({ message: "Missing public_id" });

    await cloudinary.uploader.destroy(public_id);

    res.json({
      message: "Image deleted successfully",
      public_id,
    });

  } catch (err) {
    console.error("Cloudinary delete error:", err);
    res.status(500).json({ message: "Failed to delete image" });
  }
};