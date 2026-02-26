import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { protect } from "../middlewares/authorized.middleware";

const router = Router();
const controller = new CartController();

router.get("/", protect, controller.getCart);
router.post("/add-product", protect, controller.addProduct);
router.delete("/remove/:refId", protect, controller.removeItem);
router.put("/update-quantity", protect, controller.updateQuantity); // Body: { refId, quantity }
router.delete("/clear", protect, controller.clearCart);

export default router;