// src/models/notification.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "promo";
    // "admin" removed — admins create notifications, they don't receive them
    targetRole: "all" | "user";
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, enum: ["info", "warning", "success", "promo"], default: "info" },
        targetRole: { type: String, enum: ["all", "user"], default: "all" },
        isActive: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export const NotificationModel = mongoose.model<INotification>("Notification", notificationSchema);