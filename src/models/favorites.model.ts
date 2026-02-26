import mongoose, { Schema, Document } from "mongoose";

export interface FavoriteItem {
    type: "product" | "custom";
    refId: mongoose.Types.ObjectId; // Item._id or CustomBouquet._id
}

export interface IFavorites extends Document {
    userId: mongoose.Types.ObjectId;
    items: FavoriteItem[];
    createdAt: Date;
    updatedAt: Date;
}

const favoriteItemSchema = new Schema<FavoriteItem>({
    type: { type: String, enum: ["product", "custom"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
});

const favoritesSchema = new Schema<IFavorites>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: [favoriteItemSchema],
    },
    { timestamps: true }
);

export const FavoritesModel = mongoose.model<IFavorites>("Favorites", favoritesSchema);