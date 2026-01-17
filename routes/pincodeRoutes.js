// server/routes/pincodeRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";

import {
  checkPincode,
  getAllPincodes,
  updatePincode
} from "../controllers/pincodeController.js";

const router = express.Router();

/* -----------------------------------------
   USER → Check pincode availability
----------------------------------------- */
router.get("/check/:code", checkPincode);

/* -----------------------------------------
   ADMIN → View and update pincodes
----------------------------------------- */
router.get("/", protect, adminProtect, getAllPincodes);
router.put("/:pincode", protect, adminProtect, updatePincode);

export default router;