import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { connectToDB } from "./database/mongodb";
import { PORT } from "./config";
import authRoutes from "./routes/auth.route";
import adminUserRoutes from "./routes/admin/user.route";
import itemRoutes from "./routes/item.route";
import customBouquetRoutes from "./routes/customBouquet.route";
import cartRoutes from "./routes/cart.route";
import cookieParser from 'cookie-parser';
import favoritesRoutes from "./routes/favorites.route";
import orderRoutes from "./routes/order.route";
import adminOrderRoutes from "./routes/admin/admin.order.route";
import adminDeliveryRoutes from "./routes/admin/admin.delivery.route";

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000", credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/custom-bouquets", customBouquetRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/deliveries", adminDeliveryRoutes);

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