// src/controllers/item.controller.ts
import { Request, Response } from 'express';
import { ItemService } from '../services/item.service';
import { HttpError } from '../errors/http-error';
import { AuthenticatedRequest } from '../middlewares/authorized.middleware';

const service = new ItemService();

export class ItemController {
    async createItem(req: AuthenticatedRequest, res: Response) {
        try {
            const item = await service.createItem(req);
            res.status(201).json({ success: true, data: item, message: 'Item created' });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async getAllItems(req: Request, res: Response) {
        try {
            // Safe access – works even when not logged in
            const user = (req as any).user;  // or better: use your AuthenticatedRequest type if extended properly
            const isAdmin = user?.role === 'admin';

            console.log('[getAllItems] user:', user);
            console.log('[getAllItems] isAdmin:', isAdmin);

            const result = await service.getAllItems(req.query, isAdmin);

            res.status(200).json({
                success: true,
                data: result.items,
                pagination: result.pagination,
                message: 'Items fetched'
            });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    async getSingleItem(req: Request, res: Response) {
        try {
            const id = req.params.id;
            if (Array.isArray(id)) {
                return res.status(400).json({ success: false, message: "Invalid ID format" });
            }
            if (!id) {
                return res.status(400).json({ success: false, message: "ID is required" });
            }

            const item = await service.getSingleItem(id);   // now id is string
            res.status(200).json({ success: true, data: item });
        } catch (err: any) {
            res.status(err.statusCode || 404).json({ success: false, message: err.message });
        }
    }

    // ─── updateItem ───
    async updateItem(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id;
            if (Array.isArray(id)) {
                return res.status(400).json({ success: false, message: "Invalid ID format" });
            }
            if (!id) {
                return res.status(400).json({ success: false, message: "ID is required" });
            }

            const item = await service.updateItem(req, id);
            res.status(200).json({ success: true, data: item, message: 'Item updated' });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    // ─── deleteItem ─── (same pattern)
    async deleteItem(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id;
            if (Array.isArray(id)) {
                return res.status(400).json({ success: false, message: "Invalid ID format" });
            }
            if (!id) {
                return res.status(400).json({ success: false, message: "ID is required" });
            }

            await service.deleteItem(id);
            res.status(200).json({ success: true, message: 'Item deleted' });
        } catch (err: any) {
            res.status(err.statusCode || 404).json({ success: false, message: err.message });
        }
    }
}