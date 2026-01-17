// server/scripts/importPincodes.js
import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Pincode from "../models/Pincode.js";

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const CSV_FILE = "./data/pincodes.csv"; // your CSV path

    const pincodes = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on("data", (row) => {
          // allow different column names and trim
          const pincode = (row.pincode || row.pin || row.code || "").toString().trim();
          if (!pincode) return;

          pincodes.push({
            pincode,
            city: (row.city || "").toString().trim(),
            district: (row.district || "").toString().trim(),
            state: (row.state || "").toString().trim(),
            isServiceable: true,
            codAvailable: true,
            deliveryEstimate: 5,
          });
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    if (pincodes.length === 0) {
      console.log("No pincodes found in CSV");
      process.exit(0);
    }

    console.log(`Importing ${pincodes.length} pincodes...`);
    await Pincode.deleteMany({});
    await Pincode.insertMany(pincodes);

    console.log(`Imported ${pincodes.length} pincodes successfully.`);
    process.exit(0);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  }
}

main();