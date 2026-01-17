// server/routes/adminPincodeRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";
import {
  listPincodes,
  createPincode,
  updatePincode,
  uploadPincodesCSV,
  bulkUpdatePincodes,
  getAllPincodes,
} from "../controllers/pincodeController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Paginated list
router.get("/", protect, adminProtect, listPincodes);

// Create single pincode
router.post("/", protect, adminProtect, createPincode);

// CSV upload
router.post("/upload", protect, adminProtect, upload.single("file"), uploadPincodesCSV);

// Bulk update
router.put("/bulk", protect, adminProtect, bulkUpdatePincodes);

// Update single pincode
router.put("/:pincode", protect, adminProtect, updatePincode);

// Admin full list (fallback)
router.get("/all", protect, adminProtect, getAllPincodes);

export default router;