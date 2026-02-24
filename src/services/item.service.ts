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
        const item = await repo.findById(id);
        if (!item) throw new HttpError(404, 'Item not found');
        return item;
    }

    async updateItem(req: AuthenticatedRequest, id: string): Promise<IItem> {
        const validation = UpdateItemDTO.safeParse(req.body);
        if (!validation.success) throw new HttpError(400, validation.error.issues[0].message);

        const data = validation.data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            data.images = req.files.map(file => `/uploads/${file.filename}`);
        }

        const updated = await repo.update(id, data);
        if (!updated) throw new HttpError(404, 'Item not found');
        return updated;
    }

    async deleteItem(id: string): Promise<void> {
        const deleted = await repo.softDelete(id);
        if (!deleted) throw new HttpError(404, 'Item not found');
    }
}