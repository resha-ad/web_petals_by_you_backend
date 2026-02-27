import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { protect } from "../middlewares/authorized.middleware";

const router = Router();
const controller = new OrderController();

// All routes require authentication
router.use(protect);

router.post("/", controller.placeOrder);             // Place order from cart
router.get("/", controller.getMyOrders);             // My orders (paginated)
router.get("/:id", controller.getMyOrderById);       // Single order + delivery info
router.patch("/:id/cancel", controller.cancelMyOrder); // Cancel (pending only)

export default router;