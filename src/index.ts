import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { connectToDB } from "./database/mongodb";
import { PORT } from "./config";
import authRoutes from "./routes/auth.route";
import adminUserRoutes from "./routes/admin/user.route";  // ← new

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUserRoutes);   // ← new

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running!" });
});

const startApp = async () => {
  await connectToDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startApp();

export { app };