// src/repositories/cart.repository.ts
import mongoose from "mongoose";
import { CartModel, ICart, CartItem } from "../models/cart.model";

const POPULATE_OPTIONS = {
    path: "items.refId",
    select: "name description price discountPrice flowers wrapping note recipientName totalPrice images slug",
};

export class CartRepository {
    /** Internal use only — returns Mongoose Document so .save() works */
    private async findRaw(userId: string): Promise<ICart | null> {
        return await CartModel.findOne({ userId });
    }

    /** For sending to client — lean plain object with refId fully populated */
    async findByUserId(userId: string): Promise<any | null> {
        return await CartModel.findOne({ userId })
            .populate(POPULATE_OPTIONS)
            .lean();
    }

    async addItem(userId: string, newItem: CartItem): Promise<any> {
        let cart = await this.findRaw(userId);
        if (!cart) {
            cart = new CartModel({ userId, items: [], total: 0 });
        }
        cart.items.push(newItem);
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        await cart.save();
        // Re-fetch with populate + lean for clean serialization
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