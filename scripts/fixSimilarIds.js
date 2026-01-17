// scripts/fixSimilarIds.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("🟢 Connected to MongoDB");

  const products = await Product.find({});
  console.log(`Found ${products.length} products.`);

  // Build lookup: old numeric id → mongo _id
  const idMap = {};
  products.forEach((p) => {
    if (p.id) idMap[p.id] = p._id; // legacy "id" stored during import
  });

  console.log("ID Map:", idMap);

  // Fix each product
  for (let p of products) {
    if (!Array.isArray(p.similarIds) || p.similarIds.length === 0) continue;

    const newSimilarIds = p.similarIds
      .map((legacy) => idMap[legacy])
      .filter(Boolean);

    console.log(`Updating ${p.name}`);
    console.log("Old:", p.similarIds);
    console.log("New:", newSimilarIds);

    p.similarIds = newSimilarIds;
    await p.save();
  }

  console.log("🎉 similarIds successfully converted to MongoDB ObjectIDs");
  process.exit();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});