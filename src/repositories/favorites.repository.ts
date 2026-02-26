import { FavoritesModel, IFavorites, FavoriteItem } from "../models/favorites.model";

export class FavoritesRepository {
    async findByUserId(userId: string): Promise<IFavorites | null> {
        return await FavoritesModel.findOne({ userId }).populate({
            path: "items.refId",
            select: "name description price flowers wrapping note recipientName totalPrice images",
        });
    }

    async addItem(userId: string, newItem: FavoriteItem): Promise<IFavorites> {
        const favorites = await this.findByUserId(userId) || new FavoritesModel({ userId, items: [] });
        // Avoid duplicates
        if (favorites.items.some((i) => i.refId.toString() === newItem.refId.toString() && i.type === newItem.type)) {
            return favorites;
        }
        favorites.items.push(newItem);
        return await favorites.save();
    }

    async removeItem(userId: string, refId: string): Promise<IFavorites | null> {
        const favorites = await this.findByUserId(userId);
        if (!favorites) return null;
        favorites.items = favorites.items.filter((item) => item.refId.toString() !== refId);
        return await favorites.save();
    }
}