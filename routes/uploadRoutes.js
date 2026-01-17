import express from "express";
import { deleteImage, uploadImage } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/upload", protect, adminProtect, uploadImage);
router.delete("/image/:public_id", protect, adminProtect, deleteImage);

export default router;