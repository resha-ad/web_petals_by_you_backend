import { CartRepository } from "../repositories/cart.repository";
import { HttpError } from "../errors/http-error";
import { ICart, CartItem } from "../models/cart.model";
import { ItemModel } from "../models/item.model";
import { CustomBouquetModel, ICustomBouquet } from "../models/customBouquet.model";

const repo = new CartRepository();

export class CartService {
    async addCustomBouquet(userId: string, bouquet: ICustomBouquet): Promise<ICart> {
        const cartItem: CartItem = {
            type: "custom",
            refId: bouquet._id,
            quantity: 1,
            unitPrice: bouquet.totalPrice,
            subtotal: bouquet.totalPrice,
        };
        return await repo.addItem(userId, cartItem);
    }

    async addProduct(userId: string, itemId: string, quantity: number = 1): Promise<ICart> {
        const item = await ItemModel.findById(itemId);
        if (!item) throw new HttpError(404, "Product not found");
        if (item.stock < quantity) throw new HttpError(400, "Insufficient stock");

        const unitPrice = item.discountPrice || item.price;
        const cartItem: CartItem = {
            type: "product",
            refId: item._id,
            quantity,
            unitPrice,
            subtotal: unitPrice * quantity,
        };
        return await repo.addItem(userId, cartItem);
    }

    async removeItem(userId: string, refId: string): Promise<ICart> {
        const cart = await repo.removeItem(userId, refId);
        if (!cart) throw new HttpError(404, "Cart not found");
        return cart;
    }

    async updateQuantity(userId: string, refId: string, quantity: number): Promise<ICart> {
        const cart = await repo.updateQuantity(userId, refId, quantity);
        if (!cart) throw new HttpError(404, "Cart or item not found");
        return cart;
    }

    async clearCart(userId: string): Promise<ICart> {
        const cart = await repo.clearCart(userId);
        if (!cart) throw new HttpError(404, "Cart not found");
        return cart;
    }

    async getCart(userId: string): Promise<ICart | null> {
        return await repo.findByUserId(userId);
    }
}