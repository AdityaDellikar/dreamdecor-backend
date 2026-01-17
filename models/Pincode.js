// server/models/Pincode.js
import mongoose from "mongoose";

const pincodeSchema = new mongoose.Schema(
  {
    // canonical fields 
    pincode: { type: String, required: true, unique: true },
    city: { type: String, default: "" },
    district: { type: String, default: "" },
    state: { type: String, default: "" },

    isServiceable: { type: Boolean, default: true }, // main flag
    codAvailable: { type: Boolean, default: true },
    deliveryEstimate: { type: Number, default: 5 }, // days

  },
  { timestamps: true }
);

export default mongoose.models.Pincode || mongoose.model("Pincode", pincodeSchema);