// src/services/notification.service.ts
import { NotificationModel } from "../models/notification.model";
import { UserNotificationModel } from "../models/userNotification.model";
import { HttpError } from "../errors/http-error";

export class NotificationService {
    // ── Admin: Create ─────────────────────────────────────────────────────────
    async createNotification(data: {
        title: string;
        message: string;
        type?: string;
        targetRole?: string;
        createdBy: string;
    }) {
        const notification = new NotificationModel(data);
        return await notification.save();
    }

    // ── Admin: Get all ────────────────────────────────────────────────────────
    async getAllNotifications(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            NotificationModel.find()
                .populate("createdBy", "username email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            NotificationModel.countDocuments(),
        ]);
        return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ── Admin: Update ─────────────────────────────────────────────────────────
    async updateNotification(id: string, data: Partial<{
        title: string;
        message: string;
        type: string;
        targetRole: string;
        isActive: boolean;
    }>) {
        const notification = await NotificationModel.findByIdAndUpdate(id, data, { new: true });
        if (!notification) throw new HttpError(404, "Notification not found");
        return notification;
    }

    // ── Admin: Delete ─────────────────────────────────────────────────────────
    async deleteNotification(id: string) {
        const notification = await NotificationModel.findByIdAndDelete(id);
        if (!notification) throw new HttpError(404, "Notification not found");
        // Clean up user records
        await UserNotificationModel.deleteMany({ notificationId: id });
        return true;
    }

    // ── User: Get notifications for user ─────────────────────────────────────
    async getUserNotifications(userId: string, userRole: string) {
        // Get active notifications targeting this user's role or all
        const notifications = await NotificationModel.find({
            isActive: true,
            $or: [{ targetRole: "all" }, { targetRole: userRole }],
        }).sort({ createdAt: -1 });

        if (notifications.length === 0) return [];

        const notifIds = notifications.map((n) => n._id);

        // Get user's read/cleared status
        const userStatuses = await UserNotificationModel.find({
            userId,
            notificationId: { $in: notifIds },
        });

        const statusMap = new Map(
            userStatuses.map((s) => [s.notificationId.toString(), s])
        );

        return notifications
            .filter((n) => {
                const status = statusMap.get(n._id.toString());
                return !status?.isCleared; // hide cleared ones
            })
            .map((n) => {
                const status = statusMap.get(n._id.toString());
                return {
                    ...n.toObject(),
                    isRead: status?.isRead ?? false,
                    isCleared: status?.isCleared ?? false,
                };
            });
    }

    // ── User: Mark as read ────────────────────────────────────────────────────
    async markAsRead(userId: string, notificationId: string) {
        const notification = await NotificationModel.findById(notificationId);
        if (!notification) throw new HttpError(404, "Notification not found");

        await UserNotificationModel.findOneAndUpdate(
            { userId, notificationId },
            { isRead: true },
            { upsert: true, new: true }
        );
        return true;
    }

    // ── User: Mark all as read ────────────────────────────────────────────────
    async markAllAsRead(userId: string, userRole: string) {
        const notifications = await NotificationModel.find({
            isActive: true,
            $or: [{ targetRole: "all" }, { targetRole: userRole }],
        });

        const ops = notifications.map((n) => ({
            updateOne: {
                filter: { userId, notificationId: n._id },
                update: { isRead: true },
                upsert: true,
            },
        }));

        if (ops.length > 0) await UserNotificationModel.bulkWrite(ops);
        return true;
    }

    // ── User: Clear (hide) notification ──────────────────────────────────────
    async clearNotification(userId: string, notificationId: string) {
        const notification = await NotificationModel.findById(notificationId);
        if (!notification) throw new HttpError(404, "Notification not found");

        await UserNotificationModel.findOneAndUpdate(
            { userId, notificationId },
            { isCleared: true, isRead: true },
            { upsert: true, new: true }
        );
        return true;
    }

    // ── User: Clear all notifications ─────────────────────────────────────────
    async clearAllNotifications(userId: string, userRole: string) {
        const notifications = await NotificationModel.find({
            isActive: true,
            $or: [{ targetRole: "all" }, { targetRole: userRole }],
        });

        const ops = notifications.map((n) => ({
            updateOne: {
                filter: { userId, notificationId: n._id },
                update: { isCleared: true, isRead: true },
                upsert: true,
            },
        }));

        if (ops.length > 0) await UserNotificationModel.bulkWrite(ops);
        return true;
    }
}