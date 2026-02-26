import mongoose, { Schema, Document } from "mongoose";

export interface CartItem {
    type: "product" | "custom";
    refId: mongoose.Types.ObjectId; // Item._id or CustomBouquet._id
    quantity: number;
    unitPrice: number; // Snapshot at add time
    subtotal: number;
}

export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: CartItem[];
    total: number;
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>({
    type: { type: String, enum: ["product", "custom"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
});

const cartSchema = new Schema<ICart>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: [cartItemSchema],
        total: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const CartModel = mongoose.model<ICart>("Cart", cartSchema);