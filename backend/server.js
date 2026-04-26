import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import faceRoutes from "./routes/face.js";
import authRoutes from "./routes/auth.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload limit for base64 images

app.use("/api/face", faceRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
  console.log("TYPE:", typeof process.env.DATABASE_URL);
console.log("VALUE:", process.env.DATABASE_URL);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});


app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});