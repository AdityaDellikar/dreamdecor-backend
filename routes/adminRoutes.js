// server/routes/adminRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";

import {
  getAllUsers,
  getAllOrders,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
  getAdminOrderById
} from "../controllers/adminController.js";

const router = express.Router();

/* ───────── USERS ───────── */
router.get("/users", protect, adminProtect, getAllUsers);

/* ───────── ORDERS ───────── */
router.get("/orders", protect, adminProtect, getAllOrders);
router.get("/orders/:id", protect, adminProtect, getAdminOrderById);
router.put("/orders/:id/status", protect, adminProtect, updateOrderStatus);

/* ───────── PRODUCTS ───────── */
router.get("/products", protect, adminProtect, getAllProducts);
router.get("/products/:id", protect, adminProtect, getProductById);

router.post("/products", protect, adminProtect, createProduct);
router.put("/products/:id", protect, adminProtect, updateProduct);
router.delete("/products/:id", protect, adminProtect, deleteProduct);

export default router;