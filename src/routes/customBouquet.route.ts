import { Router } from "express";
import { CustomBouquetController } from "../controllers/customBouquet.controller";
import { protect } from "../middlewares/authorized.middleware";

const router = Router();
const controller = new CustomBouquetController();

router.post("/", protect, controller.createAndAddToCart);

export default router;