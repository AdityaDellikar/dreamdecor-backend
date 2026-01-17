// server/scripts/migratePincodesLegacy.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Pincode from "../models/Pincode.js";

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const docs = await Pincode.find().lean();
    console.log("Found", docs.length, "pincode docs");

    let updated = 0;

    for (const d of docs) {
      const updates = {};

      if (typeof d.isServiceable === "undefined") {
        if (typeof d.active !== "undefined") updates.isServiceable = !!d.active;
      }

      if (typeof d.codAvailable === "undefined") {
        if (typeof d.cod !== "undefined") updates.codAvailable = !!d.cod;
        else if (typeof d.prePaid !== "undefined") updates.codAvailable = !!d.prePaid;
      }

      if (typeof d.deliveryEstimate === "undefined") {
        if (typeof d.estimatedDays !== "undefined") updates.deliveryEstimate = Number(d.estimatedDays);
      }

      // move city/district/state if missing (if present in doc)
      if (!d.city && d.city !== "" && d.city) updates.city = d.city || "";
      if (!d.district && d.district !== "" && d.district) updates.district = d.district || "";
      if (!d.state && d.state !== "" && d.state) updates.state = d.state || "";

      if (Object.keys(updates).length > 0) {
        await Pincode.updateOne({ _id: d._id }, { $set: updates });
        updated++;
      }
    }

    console.log("Migration done. Docs updated:", updated);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();