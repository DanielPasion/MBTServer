// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Enable CORS (customize origin if needed)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*", // e.g., http://localhost:3000
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
