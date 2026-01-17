import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import Razorpay from "razorpay";

console.log("Loading Razorpay keys:", !!process.env.RAZORPAY_KEY_ID ? "RAZORPAY_KEY_ID set" : "missing");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default razorpay;