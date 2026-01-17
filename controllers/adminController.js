// server/controllers/adminController.js
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

/* ------------------ HELPERS ------------------ */
const sendServerError = (res, ctx = "") =>
  res.status(500).json({ message: `Server error${ctx ? " (" + ctx + ")" : ""}` });

/* ------------------ USERS ------------------ */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (err) {
    console.error("getAllUsers:", err);
    sendServerError(res, "getAllUsers");
  }
};

/* ------------------ ORDERS ------------------ */
export const getAllOrders = async (req, res) => {
  try {
    // Consider pagination later: ?page=1&limit=20
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    console.error("getAllOrders:", err);
    sendServerError(res, "getAllOrders");
  }
};

/* ------------------ PRODUCTS ------------------ */

// GET all products (admin)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error("getAllProducts:", err);
    sendServerError(res, "getAllProducts");
  }
};

// GET one product (for Edit page)
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ product });
  } catch (err) {
    console.error("getProductById:", err);
    sendServerError(res, "getProductById");
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const product = await Product.create(payload);
    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("createProduct:", err);
    sendServerError(res, "createProduct");
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated", updated });
  } catch (err) {
    console.error("updateProduct:", err);
    sendServerError(res, "updateProduct");
  }
};

// Delete product + Cloudinary images
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete Cloudinary images if they exist
    if (Array.isArray(product.images) && product.images.length > 0) {
      for (let img of product.images) {
        if (img && img.public_id) {
          try {
            // safe cloudinary destroy
            const result = await cloudinary.uploader.destroy(img.public_id);
            console.log("Cloudinary destroy result:", img.public_id, result);
          } catch (err) {
            // log error but continue deletion of product
            console.warn("Cloudinary delete failed for", img.public_id, err.message);
          }
        }
      }
    }

    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct:", err);
    sendServerError(res, "deleteProduct");
  }
};

/* ------------------ ORDER STATUS ------------------ */

/**
 * Admin updates order status.
 * Also appends a tracking event to the order.tracking array and
 * sets delivered flags when status === "Delivered".
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message = "", location = "", meta = {} } = req.body;

    const allowed = [
      "Ordered",
      "Packed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Update main status
    order.status = status;

    // Add tracking event
    order.tracking.push({
      status,
      message,
      location,
      timestamp: new Date(),
      meta,
    });

    // convenience flags
    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    } else {
      // if reverting from delivered, clear flags (optional)
      order.isDelivered = false;
      order.deliveredAt = undefined;
    }

    await order.save();

    res.json({ message: "Status updated", updated: order });
  } catch (err) {
    console.error("updateOrderStatus:", err);
    sendServerError(res, "updateOrderStatus");
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order });
  } catch (err) {
    console.error("getAdminOrderById:", err);
    res.status(500).json({ message: "Server error" });
  }
};