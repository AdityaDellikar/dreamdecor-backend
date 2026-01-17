// server/routes/orderRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  addTrackingEvent,
  getTracking,
  createRazorpayOrder,
  verifyRazorpayPayment,
  requestOrderCancellation,
  handleCancellationByAdmin,
  requestReturn, // placeholder (implemented later)
} from "../controllers/orderController.js";

const router = express.Router();

/* -----------------------------------------
   RAZORPAY ROUTES (must come FIRST)
----------------------------------------- */
// Create Razorpay order
router.post("/razorpay/create", protect, createRazorpayOrder);

// Verify Razorpay payment
router.post("/razorpay/verify", protect, verifyRazorpayPayment);


/* -----------------------------------------
   CUSTOMER ROUTES
----------------------------------------- */

// Create COD or ONLINE order (MongoDB draft)
router.post("/", protect, createOrder);

// Get all orders for logged-in user
router.get("/my-orders", protect, getMyOrders);

// Get tracking timeline for user's order
router.get("/:id/tracking", protect, getTracking);

// Customer: request order cancellation
router.post("/:id/cancel", protect, requestOrderCancellation);

// Customer: create return request (placeholder / implemented later)
router.post("/:id/returns", protect, requestReturn);

// Get single order details (after tracking route)
router.get("/:id", protect, getOrderById);


/* -----------------------------------------
   ADMIN ROUTES
----------------------------------------- */

// Admin adds a tracking event (Packed/Shipped/etc.)
router.post("/:id/track", protect, adminProtect, addTrackingEvent);

// Admin: approve/reject cancellation (and optionally trigger refund)
router.put("/:id/cancel/handle", protect, adminProtect, handleCancellationByAdmin);

// Admin updates return request (to be implemented)
// router.put("/:id/returns/:returnId", protect, adminProtect, updateReturnStatus);

export default router;