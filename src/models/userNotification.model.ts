// src/models/userNotification.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUserNotification extends Document {
    userId: mongoose.Types.ObjectId;
    notificationId: mongoose.Types.ObjectId;
    isRead: boolean;
    isCleared: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userNotificationSchema = new Schema<IUserNotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        notificationId: { type: Schema.Types.ObjectId, ref: "Notification", required: true },
        isRead: { type: Boolean, default: false },
        isCleared: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound unique index so each user has one record per notification
userNotificationSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const UserNotificationModel = mongoose.model<IUserNotification>(
    "UserNotification",
    userNotificationSchema
);