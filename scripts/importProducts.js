// server/scripts/importProducts.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();

async function uploadToCloudinary(localPath) {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: "products",
    });
    return { url: result.secure_url, public_id: result.public_id };
  } catch (err) {
    console.error("⛔ Cloudinary upload failed:", err.message);
    return null;
  }
}

async function importProducts() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("🟢 MongoDB connected");

  const productsJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data/products.json"))
  );

  console.log(`📦 Importing ${productsJson.length} products...\n`);

  // Clear old products (optional)
  await Product.deleteMany();

  for (let prod of productsJson) {
    console.log(`➡ Uploading images for: ${prod.name}`);

    const uploadedImages = [];

    for (const imgPath of prod.images) {
      const fullPath = path.join(__dirname, "public", imgPath);
      const uploadResult = await uploadToCloudinary(fullPath);

      if (uploadResult) uploadedImages.push(uploadResult);
    }

    await Product.create({
      name: prod.name,
      price: prod.price,
      currency: prod.currency,
      description: prod.description,
      category: prod.category,
      specs: prod.specs,
      rating: prod.rating,
      reviews: prod.reviews,
      similarIds: prod.similarIds,
      images: uploadedImages,
    });

    console.log(`✅ Imported: ${prod.name}\n`);
  }

  console.log("🎉 All products imported successfully!");
  process.exit();
}

importProducts();