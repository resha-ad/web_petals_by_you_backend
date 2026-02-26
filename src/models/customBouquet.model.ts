import mongoose, { Schema, Document } from "mongoose";

export interface ICustomBouquet extends Document {
    userId: mongoose.Types.ObjectId;
    flowers: Array<{
        flowerId: string;
        name: string;
        count: number;
        pricePerStem: number;
    }>;
    wrapping: {
        id: string;
        name: string;
        price: number;
    };
    note: string;
    recipientName: string;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

const customBouquetSchema = new Schema<ICustomBouquet>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        flowers: [
            {
                flowerId: { type: String, required: true },
                name: { type: String, required: true },
                count: { type: Number, required: true },
                pricePerStem: { type: Number, required: true },
            },
        ],
        wrapping: {
            id: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
        },
        note: { type: String, default: "" },
        recipientName: { type: String, default: "" },
        totalPrice: { type: Number, required: true },
    },
    { timestamps: true }
);

export const CustomBouquetModel = mongoose.model<ICustomBouquet>("CustomBouquet", customBouquetSchema);