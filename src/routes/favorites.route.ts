import { Router } from "express";
import { FavoritesController } from "../controllers/favorites.controller";
import { protect } from "../middlewares/authorized.middleware";

const router = Router();
const controller = new FavoritesController();

router.get("/", protect, controller.getFavorites);
router.post("/add", protect, controller.addItem); // Body: { type: "product" | "custom", refId }
router.delete("/remove/:refId", protect, controller.removeItem);

export default router;