import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";
import mongoose from "mongoose";

const cartService = new CartService();

export class CartController {
    async getCart(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const cart = await cartService.getCart(req.user.id);
            res.status(200).json({ success: true, data: cart || { items: [], total: 0 } });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async addProduct(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const { itemId, quantity } = req.body;
            const cart = await cartService.addProduct(req.user.id, itemId, quantity);
            res.status(200).json({ success: true, message: "Product added to cart", data: cart });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    // In cart.controller.ts → removeItem
    async removeItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const refId = req.params.refId;

            // 1. Guard against array (should never happen with this route, but safe)
            if (Array.isArray(refId)) {
                throw new HttpError(400, "Invalid refId format – single ID expected");
            }

            // 2. Optional: validate it's a valid ObjectId (recommended)
            if (!mongoose.isValidObjectId(refId)) {
                throw new HttpError(400, "Invalid refId format");
            }

            const cart = await cartService.removeItem(req.user.id, refId as string);
            res.status(200).json({ success: true, message: "Item removed from cart", data: cart });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async updateQuantity(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const { refId, quantity } = req.body;
            const cart = await cartService.updateQuantity(req.user.id, refId, quantity);
            res.status(200).json({ success: true, message: "Quantity updated", data: cart });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async clearCart(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const cart = await cartService.clearCart(req.user.id);
            res.status(200).json({ success: true, message: "Cart cleared", data: cart });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }
}