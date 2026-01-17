//ROUTING OF LOGIN SIGNUP AND LOGOUT

import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js";
import {getLoggedInUser} from "../controllers/authController.js";

const router = express.Router();

router.get("/test", (req, res) => {
    res.json({message: "Auth API Working"});
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/me", getLoggedInUser);

export default router;