// server/models/Order.js
import mongoose from "mongoose";

/* ----------------------------------------------------
   TRACKING EVENT SCHEMA (Timeline Events)
---------------------------------------------------- */
const trackingEventSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      "Ordered",
      "Packed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Return Requested",
      "Return Approved",
      "Return Rejected",
      "Return Picked Up",
      "Refunded",
    ],
  },
  message: { type: String, default: "" },
  location: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed }, // courier metadata etc.
});

/* ----------------------------------------------------
   RETURN REQUEST SCHEMA
---------------------------------------------------- */
const returnRequestSchema = new mongoose.Schema({
  reason: String,

  items: [
    {
      productId: { type: mongoose.Schema.Types.Mixed, required: true },
      qty: { type: Number, default: 1 },
      name: String,
    },
  ],

  status: {
    type: String,
    enum: ["Requested", "Approved", "Rejected", "PickedUp", "Refunded"],
    default: "Requested",
  },

  adminNote: String,
  refundAmount: { type: Number, default: 0 },

  pickupDetails: {
    courier: String,
    awb: String,
    scheduledAt: Date,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

/* ----------------------------------------------------
   ORDER ITEM SCHEMA
---------------------------------------------------- */
const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, required: true },
  name: { type: String },
  price: { type: Number, required: true },
  qty: { type: Number, default: 1 },
  image: { type: String },

  // Selected size at time of purchase (important for fulfillment)
  selectedSize: {
    width: Number,
    height: Number,
    depth: Number,
    unit: String,
    label: String, // preformatted (eg: "24L x 18H x 1W Inches")
  },
});

/* ----------------------------------------------------
   MAIN ORDER SCHEMA
---------------------------------------------------- */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [orderItemSchema],

    shippingAddress: {
      fullName: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      postalCode: String,
      phone: String,
      landmark: String,
    },

    /* -----------------------------
       PAYMENT INFORMATION
    ----------------------------- */
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    // store gateway-specific ids (Razorpay etc.) for refunds & recordkeeping
    paymentInfo: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
      // leave room for other gateways in future
    },

    itemsPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },

    /* -----------------------------
       ORDER STATUS (latest snapshot)
    ----------------------------- */
    status: {
      type: String,
      enum: [
        "Ordered",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Return Requested",
        "Returned",
      ],
      default: "Ordered",
    },

    /* -----------------------------
       COURIER INFO (optional)
    ----------------------------- */
    courier: {
      name: String,
      awb: String,
      trackingUrl: String,
    },

    /* -----------------------------
       TRACKING TIMELINE
    ----------------------------- */
    tracking: [trackingEventSchema],

    /* -----------------------------
       RETURN WORKFLOW
    ----------------------------- */
    returns: [returnRequestSchema],

    /* -----------------------------
       CANCELLATION INFO (user requests + admin result)
       Non-breaking addition to store cancellation requests and refund bookkeeping.
    ----------------------------- */
    cancellation: {
      requested: { type: Boolean, default: false },
      requestedAt: Date,
      reasonFromDropdown: String,
      message: String,
      byUserContact: String,
      processed: { type: Boolean, default: false },
      processedAt: Date,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      result: { type: String, enum: ["Cancelled", "Rejected", "Refunded", "None"], default: "None" },
      refundAmount: { type: Number, default: 0 },
      refundInitiated: { type: Boolean, default: false },
      refundDetails: { type: mongoose.Schema.Types.Mixed },
    },

    /* -----------------------------
       INVOICE
    ----------------------------- */
    invoice: {
      invoiceId: String,
      pdfUrl: String,
      createdAt: Date,
    },

    /* -----------------------------
       DELIVERY FLAGS
    ----------------------------- */
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,

    paidAt: Date,
  },
  { timestamps: true }
);

/* Prevent model overwrite during hot reload */
export default mongoose.models.Order ||
  mongoose.model("Order", orderSchema);