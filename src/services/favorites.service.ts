import { FavoritesRepository } from "../repositories/favorites.repository";
import { HttpError } from "../errors/http-error";
import { IFavorites, FavoriteItem } from "../models/favorites.model";
import { ItemModel } from "../models/item.model";
import { CustomBouquetModel } from "../models/customBouquet.model";
import mongoose from "mongoose";

const repo = new FavoritesRepository();

export class FavoritesService {
    async addItem(userId: string, type: "product" | "custom", refId: string): Promise<IFavorites> {
        if (type === "product") {
            const item = await ItemModel.findById(refId);
            if (!item) throw new HttpError(404, "Product not found");
        } else if (type === "custom") {
            const bouquet = await CustomBouquetModel.findById(refId);
            if (!bouquet) throw new HttpError(404, "Custom bouquet not found");
            if (bouquet.userId.toString() !== userId) throw new HttpError(403, "Not your bouquet");
        }

        const favoriteItem: FavoriteItem = { type, refId: new mongoose.Types.ObjectId(refId) };
        return await repo.addItem(userId, favoriteItem);
    }

    async removeItem(userId: string, refId: string): Promise<IFavorites> {
        const favorites = await repo.removeItem(userId, refId);
        if (!favorites) throw new HttpError(404, "Favorites not found");
        return favorites;
    }

    async getFavorites(userId: string): Promise<IFavorites | null> {
        return await repo.findByUserId(userId);
    }
}