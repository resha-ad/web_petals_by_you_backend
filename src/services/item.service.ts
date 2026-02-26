// src/services/item.service.ts
import mongoose from 'mongoose';
import { ItemRepository } from '../repositories/item.repository';
import { CreateItemDTO, UpdateItemDTO } from '../dtos/item.dto';
import { HttpError } from '../errors/http-error';
import { AuthenticatedRequest } from '../middlewares/authorized.middleware';
import { ItemQueryParams } from '../repositories/item.repository';
import { IItem } from '../models/item.model';

const repo = new ItemRepository();

export class ItemService {
    async createItem(req: AuthenticatedRequest): Promise<IItem> {
        if (!req.user?.id) throw new HttpError(401, 'Authentication required');
        const validation = CreateItemDTO.safeParse(req.body);
        if (!validation.success) throw new HttpError(400, validation.error.issues[0].message);

        const data = validation.data;
        if (req.files && Array.isArray(req.files)) {
            data.images = req.files.map(file => `/uploads/${file.filename}`);
        }

        return await repo.create({
            ...data,
            createdBy: new mongoose.Types.ObjectId(req.user.id),
        });
    }

    async getAllItems(query: any, isAdmin: boolean) {
        const params: ItemQueryParams = {
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 10,
            search: query.search,
            category: query.category,
            minPrice: query.minPrice ? Number(query.minPrice) : undefined,
            maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
            featured: query.featured ? query.featured === 'true' : undefined,
            sort: query.sort,
        };

        const { items, total } = await repo.findAll(params, isAdmin);
        return {
            items,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }

    async getSingleItem(id: string): Promise<IItem> {
        const item = await repo.findByIdentifier(id);
        if (!item) throw new HttpError(404, 'Item not found');
        return item;
    }

    async updateItem(req: AuthenticatedRequest, id: string): Promise<IItem> {
        // Validate the main body (text/number fields)
        const validation = UpdateItemDTO.safeParse(req.body);
        if (!validation.success) {
            throw new HttpError(400, validation.error.issues[0].message);
        }

        const data = validation.data;

        // 1. Load current item from DB (always — for safety)
        const currentItem = await repo.findByIdentifier(id);
        if (!currentItem) throw new HttpError(404, 'Item not found');

        // 2. Start with existing images
        let images: string[] = currentItem.images || [];

        // 3. If frontend sent existingImages, use it as base (overrides DB)
        if (req.body.existingImages) {
            try {
                const sentExisting = JSON.parse(req.body.existingImages);
                if (Array.isArray(sentExisting)) {
                    images = sentExisting;
                }
            } catch (err) {
                console.warn("Invalid existingImages format:", err);
                // Keep DB images if parse fails
            }
        }

        // 4. Remove images marked for deletion
        if (req.body.removedImages) {
            try {
                const removed = JSON.parse(req.body.removedImages);
                if (Array.isArray(removed)) {
                    images = images.filter(img => !removed.includes(img));
                }
            } catch (err) {
                console.warn("Invalid removedImages format:", err);
            }
        }

        // 5. Add new uploaded images
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            images = [...images, ...newImages];
        }

        // 6. Enforce max 5 images
        if (images.length > 5) {
            throw new HttpError(400, "Maximum 5 images allowed");
        }

        // 7. Assign final images array to update data
        data.images = images;

        // 8. Perform the update
        const updated = await repo.update(id, data);
        if (!updated) throw new HttpError(404, 'Item not found');

        return updated;
    }

    async deleteItem(id: string): Promise<void> {
        const deleted = await repo.softDelete(id);
        if (!deleted) throw new HttpError(404, 'Item not found');
    }
}