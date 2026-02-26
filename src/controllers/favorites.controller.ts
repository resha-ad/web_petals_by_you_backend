import { Request, Response } from "express";
import { FavoritesService } from "../services/favorites.service";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";
import mongoose from "mongoose";

const favoritesService = new FavoritesService();

export class FavoritesController {
    async getFavorites(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const favorites = await favoritesService.getFavorites(req.user.id);
            res.status(200).json({ success: true, data: favorites || { items: [] } });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async addItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");
            const { type, refId } = req.body;
            const favorites = await favoritesService.addItem(req.user.id, type, refId);
            res.status(200).json({ success: true, message: "Added to favorites", data: favorites });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async removeItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const refId = req.params.refId;

            if (Array.isArray(refId)) {
                throw new HttpError(400, "Invalid refId format – single ID expected");
            }

            if (!mongoose.isValidObjectId(refId)) {
                throw new HttpError(400, "Invalid refId format");
            }

            const favorites = await favoritesService.removeItem(req.user.id, refId as string);
            res.status(200).json({ success: true, message: "Removed from favorites", data: favorites });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }
}