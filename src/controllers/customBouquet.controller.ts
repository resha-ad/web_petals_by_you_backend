import { Request, Response } from "express";
import { CustomBouquetService } from "../services/customBouquet.service";
import { CartService } from "../services/cart.service";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";

const bouquetService = new CustomBouquetService();
const cartService = new CartService();

export class CustomBouquetController {
    async createAndAddToCart(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const payload = req.body;
            const bouquet = await bouquetService.create(req.user.id, payload);
            const cart = await cartService.addCustomBouquet(req.user.id, bouquet);
            res.status(201).json({ success: true, message: "Bouquet created and added to cart", data: { bouquet, cart } });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }
}