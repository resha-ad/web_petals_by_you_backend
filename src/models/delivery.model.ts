import mongoose, { Schema, Document } from "mongoose";

export type DeliveryStatus =
    | "pending"
    | "assigned"
    | "in_transit"
    | "delivered"
    | "failed"
    | "cancelled";

export interface TrackingUpdate {
    message: string;
    timestamp: Date;
    updatedBy?: string; // admin username or name
}

export interface DeliveryAddress {
    street: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
}

export interface IDelivery extends Document {
    _id: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    recipientName: string;
    recipientPhone: string;
    address: DeliveryAddress;
    status: DeliveryStatus;
    scheduledDate?: Date;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    trackingUpdates: TrackingUpdate[];
    deliveryNotes?: string;   // internal admin note
    // Cancellation
    cancelledBy?: "admin";
    cancelReason?: string;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const trackingUpdateSchema = new Schema<TrackingUpdate>(
    {
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String, default: null },
    },
    { _id: false }
);

const addressSchema = new Schema<DeliveryAddress>(
    {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, default: null },
        zip: { type: String, default: null },
        country: { type: String, required: true },
    },
    { _id: false }
);

const deliverySchema = new Schema<IDelivery>(
    {
        orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        recipientName: { type: String, required: true },
        recipientPhone: { type: String, required: true },
        address: { type: addressSchema, required: true },
        status: {
            type: String,
            enum: ["pending", "assigned", "in_transit", "delivered", "failed", "cancelled"],
            default: "pending",
        },
        scheduledDate: { type: Date, default: null },
        estimatedDelivery: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        trackingUpdates: { type: [trackingUpdateSchema], default: [] },
        deliveryNotes: { type: String, default: null },
        cancelledBy: { type: String, enum: ["admin"], default: null },
        cancelReason: { type: String, default: null },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const DeliveryModel = mongoose.model<IDelivery>("Delivery", deliverySchema);