// src/controllers/notification.controller.ts
import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";

const service = new NotificationService();

const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "ID is required");
    return id;
};

export class NotificationController {
    // ── Admin: Create ─────────────────────────────────────────────────────────
    async createNotification(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const { title, message, type, targetRole } = req.body;
            if (!title || !message) throw new HttpError(400, "Title and message are required");

            const notification = await service.createNotification({
                title,
                message,
                type,
                targetRole,
                createdBy: req.user.id,
            });
            return res.status(201).json({ success: true, data: notification, message: "Notification created" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── Admin: Get all ────────────────────────────────────────────────────────
    async getAllNotifications(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await service.getAllNotifications(page, limit);
            return res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    // ── Admin: Update ─────────────────────────────────────────────────────────
    async updateNotification(req: Request, res: Response) {
        try {
            const id = getIdFromParams(req.params);
            const notification = await service.updateNotification(id, req.body);
            return res.status(200).json({ success: true, data: notification, message: "Notification updated" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── Admin: Delete ─────────────────────────────────────────────────────────
    async deleteNotification(req: Request, res: Response) {
        try {
            const id = getIdFromParams(req.params);
            await service.deleteNotification(id);
            return res.status(200).json({ success: true, message: "Notification deleted" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── User: Get my notifications ────────────────────────────────────────────
    async getMyNotifications(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const notifications = await service.getUserNotifications(req.user.id, req.user.role);
            return res.status(200).json({ success: true, data: notifications });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── User: Mark one as read ────────────────────────────────────────────────
    async markAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            await service.markAsRead(req.user.id, getIdFromParams(req.params));
            return res.status(200).json({ success: true, message: "Marked as read" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── User: Mark all as read ────────────────────────────────────────────────
    async markAllAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            await service.markAllAsRead(req.user.id, req.user.role);
            return res.status(200).json({ success: true, message: "All marked as read" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── User: Clear one ───────────────────────────────────────────────────────
    async clearNotification(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            await service.clearNotification(req.user.id, getIdFromParams(req.params));
            return res.status(200).json({ success: true, message: "Notification cleared" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }

    // ── User: Clear all ───────────────────────────────────────────────────────
    async clearAllNotifications(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            await service.clearAllNotifications(req.user.id, req.user.role);
            return res.status(200).json({ success: true, message: "All notifications cleared" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false, message: err.message,
            });
        }
    }
}