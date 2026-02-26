import mongoose from "mongoose";
import { CartModel, ICart, CartItem } from "../models/cart.model";

export class CartRepository {
    async findByUserId(userId: string): Promise<ICart | null> {
        return await CartModel.findOne({ userId }).populate({
            path: "items.refId",
            select: "name description price flowers wrapping note recipientName totalPrice images", // Adjusted for both product/custom
        });
    }

    async addItem(userId: string, newItem: CartItem): Promise<ICart> {
        const cart = await this.findByUserId(userId) || new CartModel({ userId, items: [], total: 0 });
        cart.items.push(newItem);
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        return await cart.save();
    }

    async removeItem(userId: string, refId: string): Promise<ICart | null> {
        const cart = await this.findByUserId(userId);
        if (!cart) return null;
        cart.items = cart.items.filter((item) => item.refId.toString() !== refId);
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        return await cart.save();
    }

    async updateQuantity(userId: string, refId: string, newQuantity: number): Promise<ICart | null> {
        const cart = await this.findByUserId(userId);
        if (!cart) return null;
        const item = cart.items.find((i) => i.refId.toString() === refId);
        if (!item) return null;
        if (newQuantity < 1) throw new Error("Quantity must be at least 1");
        item.quantity = newQuantity;
        item.subtotal = item.unitPrice * newQuantity;
        cart.total = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
        return await cart.save();
    }

    async clearCart(userId: string): Promise<ICart | null> {
        const cart = await this.findByUserId(userId);
        if (!cart) return null;
        cart.items = [];
        cart.total = 0;
        return await cart.save();
    }
}