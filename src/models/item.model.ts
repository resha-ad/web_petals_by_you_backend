// src/models/item.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { ItemType } from '../types/item.type';

export interface IItem extends Document {
    name: string;
    slug: string;
    description: string;
    price: number;
    discountPrice?: number | null;
    category?: string;
    images: string[];
    isFeatured: boolean;
    isAvailable: boolean;
    stock: number;
    rating: number;
    numReviews: number;
    deliveryType?: string;
    preparationTime?: number;
    createdBy: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        discountPrice: { type: Number, default: null },
        category: { type: String, default: null },
        images: { type: [String], default: [] },
        isFeatured: { type: Boolean, default: false },
        isAvailable: { type: Boolean, default: true },
        stock: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        numReviews: { type: Number, default: 0 },
        deliveryType: { type: String, default: null },
        preparationTime: { type: Number, default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const ItemModel = mongoose.model<IItem>('Item', itemSchema);