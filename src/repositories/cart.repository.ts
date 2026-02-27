// src/repositories/cart.repository.ts
import mongoose from "mongoose";
import { CartModel, ICart, CartItem } from "../models/cart.model";
import { ItemModel } from "../models/item.model";

// We can't use a single .populate() across two collections (Item + CustomBouquet)
// without a discriminator/refPath on the model. Instead we enrich manually
// after fetching — this is safe, explicit, and doesn't require schema changes.

async function enrichCartItems(cart: any): Promise<any> {
    if (!cart || !cart.items || cart.items.length === 0) return cart;

    // Separate ids by type
    const productIds = cart.items
        .filter((i: any) => i.type === "product")
        .map((i: any) => i.refId);

    const customIds = cart.items
        .filter((i: any) => i.type === "custom")
        .map((i: any) => i.refId);

    // Fetch product details
    const products: Record<string, any> = {};
    if (productIds.length > 0) {
        const items = await ItemModel.find({ _id: { $in: productIds } })
            .select("name description price discountPrice images slug stock")
            .lean();
        items.forEach((item: any) => {
            products[item._id.toString()] = item;
        });
    }

    // Fetch custom bouquet details (dynamic import avoids circular deps)
    const customs: Record<string, any> = {};
    if (customIds.length > 0) {
        // Import inline so we don't have to change top-level imports
        const { CustomBouquetModel } = await import("../models/customBouquet.model");
        const bouquets = await CustomBouquetModel.find({ _id: { $in: customIds } })
            .select("flowers wrapping note recipientName totalPrice")
            .lean();
        bouquets.forEach((b: any) => {
            customs[b._id.toString()] = b;
        });
    }

    // Attach enriched refDetails to each cart item
    const enrichedItems = cart.items.map((item: any) => {
        const id = item.refId?.toString() ?? item.refId;
        const details = item.type === "product" ? products[id] : customs[id];
        return {
            ...item,
            refDetails: details || null,
        };
    });

    return { ...cart, items: enrichedItems };
}

export class CartRepository {
    /** Internal use only — returns Mongoose Document so .save() works */
    private async findRaw(userId: string): Promise<ICart | null> {
        return await CartModel.findOne({ userId });
    }

    /** For sending to client — lean plain object with enriched refDetails */
    async findByUserId(userId: string): Promise<any | null> {
        const cart = await CartModel.findOne({ userId }).lean();
        if (!cart) return null;
        return await enrichCartItems(cart);
    }

    async addItem(userId: string, newItem: CartItem): Promise<any> {
        let cart = await this.findRaw(userId);
        if (!cart) {
            cart = new CartModel({ userId, items: [], total: 0 });
        }
        cart.items.push(newItem);
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        await cart.save();
        return await this.findByUserId(userId);
    }

    async removeItem(userId: string, refId: string): Promise<any | null> {
        const cart = await this.findRaw(userId);
        if (!cart) return null;
        cart.items = cart.items.filter((item) => item.refId.toString() !== refId);
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        await cart.save();
        return await this.findByUserId(userId);
    }

    async updateQuantity(userId: string, refId: string, newQuantity: number): Promise<any | null> {
        const cart = await this.findRaw(userId);
        if (!cart) return null;
        const item = cart.items.find((i) => i.refId.toString() === refId);
        if (!item) return null;
        if (newQuantity < 1) throw new Error("Quantity must be at least 1");
        item.quantity = newQuantity;
        item.subtotal = item.unitPrice * newQuantity;
        cart.total = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
        await cart.save();
        return await this.findByUserId(userId);
    }

    async clearCart(userId: string): Promise<any | null> {
        const cart = await this.findRaw(userId);
        if (!cart) return null;
        cart.items = [];
        cart.total = 0;
        await cart.save();
        return await this.findByUserId(userId);
    }
}