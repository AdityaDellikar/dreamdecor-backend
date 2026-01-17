import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminProtect } from "../middleware/adminMiddleware.js";

import {
  createTicket,
  getAllTickets,
  updateTicketStatus,
} from "../controllers/ticketController.js";

const router = express.Router();

/* ---------------- USER ---------------- */
router.post("/", protect, createTicket);

/* ---------------- ADMIN ---------------- */
router.get("/", protect, adminProtect, getAllTickets);
router.put("/:id", protect, adminProtect, updateTicketStatus);

export default router;