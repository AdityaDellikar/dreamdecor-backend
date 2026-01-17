import Ticket from "../models/Ticket.js";

/* -----------------------------------------
   USER: CREATE TICKET
----------------------------------------- */
export const createTicket = async (req, res) => {
  try {
    const { name, email, whatsapp, message } = req.body;

    if (!name || !email || !whatsapp || !message) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const ticket = await Ticket.create({
      name,
      email,
      whatsapp,
      message,
      user: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      message:
        "Ticket raised successfully. Our customer executive will contact you on WhatsApp within 24 hours.",
      ticket,
    });
  } catch (err) {
    console.error("createTicket:", err);
    res.status(500).json({ message: "Failed to raise ticket" });
  }
};

/* -----------------------------------------
   ADMIN: GET ALL TICKETS
----------------------------------------- */
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.json({ tickets });
  } catch (err) {
    console.error("getAllTickets:", err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

/* -----------------------------------------
   ADMIN: UPDATE TICKET STATUS
----------------------------------------- */
export const updateTicketStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (status) ticket.status = status;
    if (adminNote !== undefined) ticket.adminNote = adminNote;

    await ticket.save();

    res.json({
      success: true,
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (err) {
    console.error("updateTicketStatus:", err);
    res.status(500).json({ message: "Failed to update ticket" });
  }
};