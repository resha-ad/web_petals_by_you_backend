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

    // ← Coerce booleans too
    isFeatured: z.coerce.boolean().default(false),
    isAvailable: z.coerce.boolean().default(true),

    category: z.string().optional(),
    deliveryType: z.string().optional(),
    images: z.array(z.string().url('Invalid image URL')).default([]),
});

export type ItemType = z.infer<typeof ItemSchema>;