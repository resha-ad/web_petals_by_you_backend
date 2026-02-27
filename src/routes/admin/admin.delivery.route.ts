import { Router } from "express";
import { AdminDeliveryController } from "../../controllers/admin/admin.delivery.controller";
import { protect, adminOnly } from "../../middlewares/authorized.middleware";

const router = Router();
const controller = new AdminDeliveryController();

router.use(protect, adminOnly);

router.post("/", controller.createDelivery);                          // Create delivery for an order
router.get("/", controller.getAllDeliveries);                         // All deliveries
router.get("/order/:orderId", controller.getDeliveryByOrderId);      // By order ID  ← must be before /:id
router.get("/:id", controller.getDeliveryById);                      // By delivery ID
router.patch("/:id", controller.updateDelivery);                     // Update details/status
router.post("/:id/tracking", controller.addTrackingUpdate);          // Push tracking message
router.patch("/:id/cancel", controller.cancelDelivery);              // Cancel delivery

export default router;