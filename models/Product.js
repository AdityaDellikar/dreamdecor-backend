import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  comment: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
});

const specsSchema = new mongoose.Schema({
  material: String,
  color: String,
  weight: String,
  dimensions: {
    width: Number,
    height: Number,
    unit: { type: String, default: "inch" },
  },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    description: String,
    category: String,

    // Specs block (material, color, dimensions, etc.)
    specs: specsSchema,

    // Rating average (not required)
    rating: { type: Number, min: 1, max: 5, default: 4 },

    // Full real reviews stored here
    reviews: [reviewSchema],

    // Similar products using MongoDB ObjectIDs
    similarIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Cloudinary images
    images: [imageSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);