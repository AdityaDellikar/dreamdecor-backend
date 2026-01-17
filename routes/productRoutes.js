import express from "express";
import { getAllProducts, getProductById } from "../controllers/productController.js";

const router = express.Router();

// Public — Get all products
router.get("/", getAllProducts);

// Public — Get single product
router.get("/:id", getProductById);

export default router;