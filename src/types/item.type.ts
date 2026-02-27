// src/types/item.type.ts
import { z } from 'zod';

export const ItemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),

    // ← Add .coerce here for numbers
    price: z.coerce.number().positive('Price must be positive'),
    discountPrice: z.coerce.number()
        .positive('Discount price must be positive')
        .optional()
        .nullable(),

    stock: z.coerce.number()
        .int()
        .nonnegative('Stock must be non-negative')
        .default(0),

    rating: z.coerce.number().default(0),
    numReviews: z.coerce.number().default(0),
    preparationTime: z.coerce.number()
        .int()
        .nonnegative('Preparation time must be non-negative')
        .optional(),

    //Proper boolean parsing for "0"/"1" strings
    isFeatured: z.preprocess(
        (val) => {
            if (val === "1" || val === 1 || val === "true") return true;
            if (val === "0" || val === 0 || val === "false") return false;
            return val;
        },
        z.boolean().default(false)
    ),

    isAvailable: z.preprocess(
        (val) => {
            if (val === "1" || val === 1 || val === "true") return true;
            if (val === "0" || val === 0 || val === "false") return false;
            return val;
        },
        z.boolean().default(true)
    ),

    category: z.string().optional(),
    deliveryType: z.string().optional(),
    images: z.array(z.string().url('Invalid image URL')).default([]),
});

export type ItemType = z.infer<typeof ItemSchema>;