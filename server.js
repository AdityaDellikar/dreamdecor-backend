// MAIN EXPRESS SERVER

import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import pincodeRoutes from "./routes/pincodeRoutes.js";
import adminPincodeRoutes from "./routes/adminPincodeRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";




connectDB();

const app = express();

// CORS MUST BE FIRST
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/admin/pincodes", adminPincodeRoutes);
app.use("/api/tickets", ticketRoutes);

// Server start
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🔥 Server running on port: ${PORT}`);
});