// src/routes/notification.route.ts
import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { protect, adminOnly } from "../middlewares/authorized.middleware";

const router = Router();
const controller = new NotificationController();

// ── User routes (authenticated) ───────────────────────────────────────────────
router.get("/my", protect, controller.getMyNotifications.bind(controller));
router.patch("/:id/read", protect, controller.markAsRead.bind(controller));
router.patch("/read-all", protect, controller.markAllAsRead.bind(controller));
router.patch("/:id/clear", protect, controller.clearNotification.bind(controller));
router.patch("/clear-all", protect, controller.clearAllNotifications.bind(controller));

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post("/", protect, adminOnly, controller.createNotification.bind(controller));
router.get("/", protect, adminOnly, controller.getAllNotifications.bind(controller));
router.put("/:id", protect, adminOnly, controller.updateNotification.bind(controller));
router.delete("/:id", protect, adminOnly, controller.deleteNotification.bind(controller));

export default router;