import { Router } from "express";
import { AdminOrderController } from "../../controllers/admin/admin.order.controller";
import { protect, adminOnly } from "../../middlewares/authorized.middleware";

const router = Router();
const controller = new AdminOrderController();

router.use(protect, adminOnly);

router.get("/", controller.getAllOrders);                    // All orders with filters
router.get("/:id", controller.getOrderById);                // Single order detail
router.patch("/:id/status", controller.updateOrderStatus);  // Update status
router.patch("/:id/cancel", controller.cancelOrder);        // Cancel order

export default router;