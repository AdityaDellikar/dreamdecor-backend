// server/controllers/pincodeController.js
import fs from "fs";
import { parse as csvParser } from "csv-parse";
import Pincode from "../models/Pincode.js";

/**
 * Normalize DB doc into canonical response fields
 */
function normalizePinDoc(doc) {
  if (!doc) return null;

  const isServiceable = typeof doc.isServiceable !== "undefined"
    ? doc.isServiceable
    : (typeof doc.active !== "undefined" ? !!doc.active : true);

  const codAvailable = typeof doc.codAvailable !== "undefined"
    ? doc.codAvailable
    : (typeof doc.cod !== "undefined" ? !!doc.cod : (typeof doc.prePaid !== "undefined" ? !!doc.prePaid : true));

  const deliveryEstimate = typeof doc.deliveryEstimate !== "undefined"
    ? doc.deliveryEstimate
    : (typeof doc.estimatedDays !== "undefined" ? doc.estimatedDays : 5);

  return {
    id: String(doc._id),
    pincode: doc.pincode,
    city: doc.city || "",
    district: doc.district || "",
    state: doc.state || "",
    isServiceable: !!isServiceable,
    codAvailable: !!codAvailable,
    deliveryEstimate: Number(deliveryEstimate),
    message: isServiceable ? "Delivery available!" : "We do not deliver to this pincode yet.",
  };
}

/* -------------------------------------------
   ADMIN → Paginated list (and optional search/state filter)
   GET /admin/pincodes?page=1&limit=20&search=500&state=Telangana
------------------------------------------- */
export const listPincodes = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const search = (req.query.search || "").trim();
    const state = (req.query.state || "").trim();

    const filter = {};
    if (search) filter.pincode = { $regex: search, $options: "i" };
    if (state) filter.state = state;

    const total = await Pincode.countDocuments(filter);
    const docs = await Pincode.find(filter)
      .sort({ state: 1, district: 1, pincode: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      pincodes: docs.map(normalizePinDoc),
    });
  } catch (err) {
    console.error("listPincodes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   ADMIN → Create a single pincode
   POST /admin/pincodes
   body: { pincode, city, district, state, isServiceable, codAvailable, deliveryEstimate }
------------------------------------------- */
export const createPincode = async (req, res) => {
  try {
    const {
      pincode,
      city = "",
      district = "",
      state = "",
      isServiceable = true,
      codAvailable = true,
      deliveryEstimate = 5,
    } = req.body;

    if (!pincode) return res.status(400).json({ message: "Missing pincode" });

    const exists = await Pincode.findOne({ pincode });
    if (exists) {
      return res.status(409).json({ message: "Pincode already exists" });
    }

    const doc = await Pincode.create({
      pincode: String(pincode).trim(),
      city,
      district,
      state,
      isServiceable,
      codAvailable,
      deliveryEstimate,
    });

    res.status(201).json({ message: "Pincode created", pincode: normalizePinDoc(doc) });
  } catch (err) {
    console.error("createPincode:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   ADMIN → Bulk update
   PUT /admin/pincodes/bulk
   body:
   {
     action: "enable" | "disable" | "setDays",
     ids: ["500030","400001"] OR city / state filter,
     days: 5 (for setDays)
   }
------------------------------------------- */
export const bulkUpdatePincodes = async (req, res) => {
  try {
    const { action, ids = [], city, state, days } = req.body;

    const filter = {};
    if (Array.isArray(ids) && ids.length > 0) {
      filter.pincode = { $in: ids.map(String) };
    } else {
      if (city) filter.city = city;
      if (state) filter.state = state;
    }

    if (!action) return res.status(400).json({ message: "Missing action" });
    if (!filter.pincode && !filter.city && !filter.state) {
      return res.status(400).json({ message: "Missing target (ids / city / state)" });
    }

    const updates = {};
    if (action === "enable") updates.isServiceable = true;
    else if (action === "disable") updates.isServiceable = false;
    else if (action === "setDays") updates.deliveryEstimate = Number(days) || 5;
    else return res.status(400).json({ message: "Unknown action" });

    const result = await Pincode.updateMany(filter, { $set: updates });

    res.json({ message: "Bulk update applied", modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("bulkUpdatePincodes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   ADMIN → CSV upload (multipart form-data)
   POST /admin/pincodes/upload (file field: file)
   CSV expected columns: pincode,city,district,state,isServiceable,codAvailable,deliveryEstimate
------------------------------------------- */
export const uploadPincodesCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const buffer = req.file.buffer;
    const text = buffer.toString("utf8");

    const rows = [];
    await new Promise((resolve, reject) => {
      csvParser(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, output) => {
        if (err) return reject(err);
        output.forEach((row) => {
          rows.push(row);
        });
        resolve();
      });
    });

    // Normalize and upsert each row
    let upserted = 0;
    for (const r of rows) {
      const pincode = String(r.pincode || "").trim();
      if (!pincode) continue;
      const doc = {
        pincode,
        city: r.city || "",
        district: r.district || "",
        state: r.state || "",
        isServiceable: typeof r.isServiceable !== "undefined" ? (String(r.isServiceable).toLowerCase() === "true") : true,
        codAvailable: typeof r.codAvailable !== "undefined" ? (String(r.codAvailable).toLowerCase() === "true") : true,
        deliveryEstimate: Number(r.deliveryEstimate) || 5,
      };

      const up = await Pincode.updateOne({ pincode }, { $set: doc }, { upsert: true });
      upserted += 1;
    }

    res.json({ message: "CSV processed", imported: rows.length });
  } catch (err) {
    console.error("uploadPincodesCSV:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   USER → Check pincode availability
   GET /pincodes/check/:code  (mounted separately)
------------------------------------------- */
export const checkPincode = async (req, res) => {
  try {
    const code = (req.params.code || "").trim();
    if (!code) {
      return res.status(400).json({ message: "Missing pincode" });
    }

    const pin = await Pincode.findOne({ pincode: code }).lean();

    if (!pin) {
      return res.json({
        serviceable: false,
        message: "We do not deliver to this pincode yet.",
      });
    }

    // Return normalized format
    return res.json({
      serviceable: !!pin.isServiceable,
      cod: !!pin.codAvailable,
      estimate: Number(pin.deliveryEstimate),
      city: pin.city || "",
      district: pin.district || "",
      state: pin.state || "",
      message: pin.isServiceable
        ? `Delivery available to ${pin.city}, ${pin.state}`
        : "Delivery not available.",
    });

  } catch (err) {
    console.error("checkPincode:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   ADMIN → Get all pincodes (non-paginated fallback)
------------------------------------------- */
export const getAllPincodes = async (req, res) => {
  try {
    const list = await Pincode.find().sort({ state: 1, district: 1 }).lean();
    res.json({ pincodes: list.map(normalizePinDoc) });
  } catch (err) {
    console.error("getAllPincodes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------
   ADMIN → Update a pincode (by pincode string)
------------------------------------------- */
export const updatePincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!pincode) return res.status(400).json({ message: "Missing pincode param" });

    const exists = await Pincode.findOne({ pincode });
    if (!exists) {
      return res.status(404).json({ message: "Pincode not found" });
    }

    const updates = {};
    if (typeof req.body.isServiceable !== "undefined") updates.isServiceable = !!req.body.isServiceable;
    if (typeof req.body.codAvailable !== "undefined") updates.codAvailable = !!req.body.codAvailable;
    if (typeof req.body.deliveryEstimate !== "undefined") updates.deliveryEstimate = Number(req.body.deliveryEstimate);
    if (typeof req.body.city !== "undefined") updates.city = req.body.city;
    if (typeof req.body.district !== "undefined") updates.district = req.body.district;
    if (typeof req.body.state !== "undefined") updates.state = req.body.state;

    await Pincode.updateOne({ pincode }, { $set: updates });

    const updated = await Pincode.findOne({ pincode }).lean();
    res.json({ message: "Pincode updated", pincode: normalizePinDoc(updated) });
  } catch (err) {
    console.error("updatePincode:", err);
    res.status(500).json({ message: "Server error" });
  }
};