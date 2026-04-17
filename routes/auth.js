const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const router = express.Router();
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log("Incoming request:", username);

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists. Please Login.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "4h" });

    res.status(201).json({
      message: "User registered successfully.",
      token,
      username,
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isPasswordCorrectMatch = await user.comparePassword(password);
    if (!isPasswordCorrectMatch)
      return res.status(400).json({ message: "Invalid Credentials" });
    res
      .status(200)
      .json({ message: "Login successful", username: user.username });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error while login.", error: error });
  }
});

module.exports = router;
