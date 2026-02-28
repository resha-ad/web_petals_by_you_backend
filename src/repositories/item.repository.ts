// src/repositories/item.repository.ts
import { IItem, ItemModel } from '../models/item.model';
import { ItemType } from '../types/item.type';

export interface ItemQueryParams {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    sort?: string;
}

export interface IItemRepository {
    create(item: Partial<IItem>): Promise<IItem>;
    findByIdentifier(identifier: string): Promise<IItem | null>;
    findAll(params: ItemQueryParams, isAdmin: boolean): Promise<{ items: IItem[]; total: number }>;
    update(id: string, item: Partial<ItemType>): Promise<IItem | null>;
    softDelete(id: string): Promise<boolean>;
}

export class ItemRepository implements IItemRepository {
    private async generateUniqueSlug(name: string): Promise<string> {
        let slug = name
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        let existing = await ItemModel.findOne({ slug });
        let count = 1;
        while (existing) {
            slug = `${slug}-${count}`;
            existing = await ItemModel.findOne({ slug });
            count++;
        }
        return slug;
    }

    async create(item: Partial<IItem>): Promise<IItem> {
        if (!item.name) throw new Error('Name is required');

        const slug = await this.generateUniqueSlug(item.name);

        const newItem = new ItemModel({
            ...item,
            slug,
        });

        return await newItem.save();
    }

    async findByIdentifier(identifier: string): Promise<IItem | null> {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
        const query = isObjectId
            ? { _id: identifier, isDeleted: false }
            : { slug: identifier, isDeleted: false };

        return await ItemModel.findOne(query)
            .populate('createdBy', 'username email');
    }

    async findAll(
        params: ItemQueryParams,
        isAdmin: boolean
    ): Promise<{ items: IItem[]; total: number }> {
        const { page, limit, search, category, minPrice, maxPrice, featured, sort } = params;

        const filter: any = { isDeleted: false };

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (category) {
            filter.category = category;
        }
        if (minPrice !== undefined) {
            filter.price = { $gte: minPrice };
        }
        if (maxPrice !== undefined) {
            filter.price = { ...filter.price, $lte: maxPrice };
        }
        if (featured !== undefined) {
            filter.isFeatured = featured;
        }

        let sortOptions: { [key: string]: 1 | -1 } = { createdAt: -1 };
        if (sort) {
            const [field, order] = sort.split(':');
            sortOptions = { [field]: order === 'asc' ? 1 : -1 };
        }

        const query = ItemModel.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sortOptions);

        // Only populate createdBy for admins
        if (isAdmin) {
            query.populate('createdBy', 'username email');
        }

        // Limit fields for public users — isFeatured and stock are needed by the frontend
        if (!isAdmin) {
            query.select('name slug description price discountPrice category images isAvailable isFeatured stock preparationTime');
        }

        const [items, total] = await Promise.all([
            query.exec(),
            ItemModel.countDocuments(filter),
        ]);

        return { items, total };
    }

    async update(id: string, item: Partial<ItemType>): Promise<IItem | null> {
        if (item.name) {
            const slug = await this.generateUniqueSlug(item.name);
            (item as any).slug = slug;
        }

        return await ItemModel.findOneAndUpdate(
            { _id: id, isDeleted: false },
            item,
            { new: true }
        );
    }

    async softDelete(id: string): Promise<boolean> {
        const result = await ItemModel.findOneAndUpdate(
            { _id: id },
            { isDeleted: true }
        );
        return !!result;
    }
}