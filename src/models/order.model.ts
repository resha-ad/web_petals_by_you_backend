import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type PaymentMethod = "cash_on_delivery" | "online";

export interface OrderItem {
    type: "product" | "custom";
    refId: mongoose.Types.ObjectId;
    name: string;        // snapshot
    unitPrice: number;   // snapshot
    quantity: number;
    subtotal: number;
    imageUrl?: string;   // snapshot (first image)
}

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    notes?: string;
    // Cancellation (by either user or admin)
    cancelledBy?: "user" | "admin";
    cancelReason?: string;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
    {
        type: { type: String, enum: ["product", "custom"], required: true },
        refId: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, min: 1, required: true },
        subtotal: { type: Number, required: true },
        imageUrl: { type: String, default: null },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: { type: [orderItemSchema], required: true },
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"],
            default: "pending",
        },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "refunded"],
            default: "unpaid",
        },
        paymentMethod: {
            type: String,
            enum: ["cash_on_delivery", "online"],
            default: "cash_on_delivery",
        },
        notes: { type: String, default: null },
        cancelledBy: { type: String, enum: ["user", "admin"], default: null },
        cancelReason: { type: String, default: null },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const OrderModel = mongoose.model<IOrder>("Order", orderSchema);