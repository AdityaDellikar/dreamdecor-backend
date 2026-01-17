// server/controllers/orderController.js
import Order from "../models/Order.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";

/* ============================================================
    1. COD — CREATE ORDER DIRECTLY
============================================================ */
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod = "COD",
      itemsPrice = 0,
      shippingPrice = 0,
      taxPrice = 0,
      totalPrice = 0,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    // If ONLINE → STOP here → handled by Razorpay verification route
    if (paymentMethod === "ONLINE") {
      return res.status(400).json({
        message: "Use Razorpay payment flow for online payments",
      });
    }

    // COD: Create order immediately
    const order = new Order({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod: "COD",
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      status: "Ordered",
      paymentStatus: "Pending",
    });

    order.tracking.push({
      status: "Ordered",
      message: "Order placed with Cash on Delivery",
      timestamp: new Date(),
    });

    const created = await order.save();
    res.status(201).json({ message: "COD Order created", order: created });
  } catch (err) {
    console.error("createOrder:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    2. USER'S ORDERS
============================================================ */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ orders });
  } catch (err) {
    console.error("getMyOrders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    3. SINGLE ORDER DETAILS
============================================================ */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      req.user._id.toString() !== order.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ order });
  } catch (err) {
    console.error("getOrderById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    4. ADMIN: ADD TRACKING EVENT
============================================================ */
export const addTrackingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, location, meta } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const event = {
      status,
      message: message || "",
      location: location || "",
      meta: meta || {},
      timestamp: new Date(),
    };

    order.tracking.push(event);
    order.status = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    await order.save();
    res.json({ message: "Event added", event, order });
  } catch (err) {
    console.error("addTrackingEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    5. USER TRACKING TIMELINE
============================================================ */
export const getTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).select(
      "tracking status courier createdAt user"
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      req.user._id.toString() !== order.user.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      tracking: order.tracking,
      status: order.status,
      courier: order.courier,
    });
  } catch (err) {
    console.error("getTracking:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    6. RAZORPAY ORDER (CREATE PAYMENT ORDER)
============================================================ */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount missing or invalid" });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createRazorpayOrder:", err);
    res.status(500).json({ message: "Razorpay error" });
  }
};

/* ============================================================
    7. VERIFY PAYMENT + CREATE ORDER IN DATABASE
============================================================ */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderPayload,
    } = req.body;

    // Signature verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    // Create order in DB AFTER payment is successful
    const newOrder = new Order({
      user: req.user._id,
      items: orderPayload.items,
      shippingAddress: orderPayload.shippingAddress,
      paymentMethod: "ONLINE",
      itemsPrice: orderPayload.itemsPrice,
      shippingPrice: orderPayload.shippingPrice,
      taxPrice: orderPayload.taxPrice,
      totalPrice: orderPayload.totalPrice,
      status: "Ordered",
      paymentStatus: "Paid",
      paidAt: new Date(),

      // store Razorpay meta for refunds
      paymentInfo: {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      },

      tracking: [
        {
          status: "Ordered",
          message: "Order placed after successful payment",
          timestamp: new Date(),
        },
      ],
    });

    await newOrder.save();

    res.json({ success: true, message: "Payment verified", order: newOrder });
  } catch (err) {
    console.error("verifyRazorpayPayment:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

/* ============================================================
    8. USER: Request Order Cancellation
    - only allowed if order not yet shipped/out for delivery/delivered
    - stores cancellation metadata and pushes a tracking event
============================================================ */
export const requestOrderCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonOption = "", message = "" } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // only owner or admin (this endpoint intended for customers)
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Disallow cancellation if shipped/delivered
    const notAllowed = ["Shipped", "Out for Delivery", "Delivered"];
    if (notAllowed.includes(order.status)) {
      return res.status(400).json({ message: "Order already shipped or delivered and cannot be cancelled" });
    }

    order.cancellation = {
      requested: true,
      requestedAt: new Date(),
      reasonFromDropdown: reasonOption,
      message,
      byUserContact: order.shippingAddress?.phone || "",
      processed: false,
      result: "None",
      refundInitiated: false,
      refundAmount: order.paymentMethod === "ONLINE" && order.paymentStatus === "Paid" ? order.totalPrice : 0,
    };

    order.tracking.push({
      status: "Return Requested",
      message: `Cancellation requested by user: ${reasonOption || "No reason provided"}`,
      timestamp: new Date(),
    });

    await order.save();

    const assistanceMsg = "For assistance, contact +91 123457890 via WhatsApp.";
    res.json({ message: "Cancellation requested", order, assistanceMsg });
  } catch (err) {
    console.error("requestOrderCancellation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    9. ADMIN: Approve / Reject Cancellation
    - action = 'approve' | 'reject'
    - if approve and refundNow=true attempt Razorpay refund (if paymentInfo exists)
    - adminProtect must protect this route
============================================================ */
export const handleCancellationByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action = "approve", refundNow = false } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.cancellation || !order.cancellation.requested) {
      return res.status(400).json({ message: "No cancellation request found for this order" });
    }

    if (action === "reject") {
      order.cancellation.processed = true;
      order.cancellation.processedAt = new Date();
      order.cancellation.processedBy = req.user._id;
      order.cancellation.result = "Rejected";

      order.tracking.push({
        status: "Return Rejected",
        message: "Cancellation request rejected by admin",
        timestamp: new Date(),
      });

      await order.save();
      return res.json({ message: "Cancellation rejected", order });
    }

    // APPROVE cancellation
    order.cancellation.processed = true;
    order.cancellation.processedAt = new Date();
    order.cancellation.processedBy = req.user._id;
    order.cancellation.result = "Cancelled";
    order.status = "Returned"; // we use "Returned" per schema enums
    // do not mark paymentStatus refunded unless refund is performed

    order.tracking.push({
      status: "Return Approved",
      message: "Cancellation approved by admin",
      timestamp: new Date(),
    });

    // If payment was ONLINE and Paid, optionally initiate refund now
    if (refundNow && order.paymentMethod === "ONLINE" && order.paymentStatus === "Paid") {
      try {
        const paymentId = order.paymentInfo?.razorpay_payment_id;
        if (paymentId) {
          const amountPaise = Math.round((order.cancellation.refundAmount || order.totalPrice) * 100);
          const refundResp = await razorpay.payments.refund(paymentId, { amount: amountPaise });
          order.cancellation.refundInitiated = true;
          order.cancellation.refundDetails = refundResp;
          order.cancellation.refundAmount = (order.cancellation.refundAmount || order.totalPrice);
          order.paymentStatus = "Refunded";
        } else {
          console.warn("No payment id on order; cannot auto-refund. Admin must refund manually.");
        }
      } catch (err) {
        console.error("Automatic refund failed:", err);
        // Leave refundInitiated false so admin can retry later
      }
    }

    await order.save();
    res.json({ message: "Cancellation approved", order });
  } catch (err) {
    console.error("handleCancellationByAdmin:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
    10. USER REQUEST PRODUCT RETURN (placeholder)
    (return system will be implemented next; placeholder kept)
============================================================ */
export const requestReturn = async (req, res) => {
  return res.status(501).json({ message: "Return API not implemented yet" });
};