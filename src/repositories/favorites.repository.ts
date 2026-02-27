// src/repositories/favorites.repository.ts
import { FavoritesModel, IFavorites, FavoriteItem } from "../models/favorites.model";

const POPULATE_OPTIONS = {
    path: "items.refId",
    select: "name description price discountPrice images slug flowers wrapping note recipientName totalPrice",
};

export class FavoritesRepository {
    /** Internal — Mongoose Document so .save() works */
    private async findRaw(userId: string): Promise<IFavorites | null> {
        return await FavoritesModel.findOne({ userId });
    }

    /** For client responses — lean plain object with refId fully populated */
    async findByUserId(userId: string): Promise<any | null> {
        return await FavoritesModel.findOne({ userId })
            .populate(POPULATE_OPTIONS)
            .lean();
    }

    async addItem(userId: string, newItem: FavoriteItem): Promise<any> {
        let favorites = await this.findRaw(userId);
        if (!favorites) {
            favorites = new FavoritesModel({ userId, items: [] });
        }
        // Avoid duplicates
        const alreadyExists = favorites.items.some(
            (i) => i.refId.toString() === newItem.refId.toString() && i.type === newItem.type
        );
        if (!alreadyExists) {
            favorites.items.push(newItem);
            await favorites.save();
        }
        return await this.findByUserId(userId);
    }

    async removeItem(userId: string, refId: string): Promise<any | null> {
        const favorites = await this.findRaw(userId);
        if (!favorites) return null;
        favorites.items = favorites.items.filter((item) => item.refId.toString() !== refId);
        await favorites.save();
        return await this.findByUserId(userId);
    }
}