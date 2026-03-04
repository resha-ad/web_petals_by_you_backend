// src/__tests__/integration/items.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import { ItemModel } from '../../models/item.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Items Integration Tests', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let itemId: string;
    let itemSlug: string;

    beforeEach(async () => {
        // Create admin user
        const admin = await UserModel.create({
            username: 'items_admin',
            email: 'items_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12),
            role: 'admin',
        });
        adminId = admin._id.toString();
        adminToken = jwt.sign(
            { id: adminId, email: admin.email, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        // Create normal user
        const user = await UserModel.create({
            username: 'items_user',
            email: 'items_user@example.com',
            password: await bcryptjs.hash('UserPass123!', 12),
            role: 'user',
        });
        userToken = jwt.sign(
            { id: user._id.toString(), email: user.email, username: user.username, role: 'user' },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        // Create a seed item
        const item = await ItemModel.create({
            name: 'Red Rose Bouquet',
            slug: 'red-rose-bouquet',
            description: 'Beautiful red roses',
            price: 1500,
            stock: 10,
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        itemId = item._id.toString();
        itemSlug = item.slug;
    });

    // ── GET all items ──────────────────────────────────────────────
    it('1. GET /api/items → 200 returns paginated items (guest)', async () => {
        const res = await request(app).get('/api/items');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items).toBeDefined();
        expect(res.body.data.pagination).toBeDefined();
        expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('2. GET /api/items → 200 returns items as admin (with createdBy populated)', async () => {
        const res = await request(app)
            .get('/api/items')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('3. GET /api/items → filters by search query', async () => {
        const res = await request(app).get('/api/items?search=Red Rose');
        expect(res.status).toBe(200);
        expect(res.body.data.items.some((i: any) => i.name.includes('Red Rose'))).toBe(true);
    });

    it('4. GET /api/items → filters by category', async () => {
        await ItemModel.create({
            name: 'Tulip Bundle',
            slug: 'tulip-bundle',
            description: 'Fresh tulips',
            price: 800,
            stock: 5,
            category: 'tulips',
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        const res = await request(app).get('/api/items?category=tulips');
        expect(res.status).toBe(200);
        expect(res.body.data.items.every((i: any) => i.category === 'tulips')).toBe(true);
    });

    it('5. GET /api/items → filters by minPrice and maxPrice', async () => {
        const res = await request(app).get('/api/items?minPrice=1000&maxPrice=2000');
        expect(res.status).toBe(200);
        expect(res.body.data.items.every((i: any) => i.price >= 1000 && i.price <= 2000)).toBe(true);
    });

    it('6. GET /api/items → filters by featured=true', async () => {
        await ItemModel.create({
            name: 'Featured Bouquet',
            slug: 'featured-bouquet',
            description: 'A featured item',
            price: 2000,
            stock: 3,
            isFeatured: true,
            isAvailable: true,
            images: [],
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        const res = await request(app).get('/api/items?featured=true');
        expect(res.status).toBe(200);
        expect(res.body.data.items.every((i: any) => i.isFeatured === true)).toBe(true);
    });

    it('7. GET /api/items → pagination works (page + limit)', async () => {
        for (let i = 0; i < 5; i++) {
            await ItemModel.create({
                name: `Extra Item ${i}`,
                slug: `extra-item-${i}-${Date.now()}`,
                description: 'Extra',
                price: 500,
                stock: 1,
                images: [],
                isFeatured: false,
                isAvailable: true,
                createdBy: new mongoose.Types.ObjectId(adminId),
            });
        }
        const res = await request(app).get('/api/items?page=1&limit=3');
        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBeLessThanOrEqual(3);
        expect(res.body.data.pagination.limit).toBe(3);
    });

    it('8. GET /api/items → sort by price:asc', async () => {
        const res = await request(app).get('/api/items?sort=price:asc');
        expect(res.status).toBe(200);
        const prices = res.body.data.items.map((i: any) => i.price);
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sorted);
    });

    // ── GET single item ────────────────────────────────────────────
    it('9. GET /api/items/:id → 200 by mongo ID', async () => {
        const res = await request(app).get(`/api/items/${itemId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(itemId);
    });

    it('10. GET /api/items/:id → 200 by slug', async () => {
        const res = await request(app).get(`/api/items/${itemSlug}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.slug).toBe(itemSlug);
    });

    it('11. GET /api/items/:id → 404 non-existent ID', async () => {
        const res = await request(app).get(`/api/items/507f191e810c19729de860ea`);
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Item not found');
    });

    // ── GET by /id/:id route ───────────────────────────────────────
    it('12. GET /api/items/id/:id → 200 returns item', async () => {
        const res = await request(app).get(`/api/items/id/${itemId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(itemId);
    });

    it('13. GET /api/items/id/:id → 404 non-existent', async () => {
        const res = await request(app).get(`/api/items/id/507f191e810c19729de860ea`);
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    // ── POST create item ───────────────────────────────────────────
    it('14. POST /api/items → 201 admin creates item', async () => {
        const res = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Sunflower Bunch')
            .field('description', 'Bright sunflowers')
            .field('price', '1200')
            .field('stock', '8')
            .field('isFeatured', 'false')
            .field('isAvailable', 'true')

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Sunflower Bunch');
        expect(res.body.data.slug).toBe('sunflower-bunch');
    });

    it('15. POST /api/items → 401 unauthenticated', async () => {
        const res = await request(app)
            .post('/api/items')
            .field('name', 'Test Item')
            .field('description', 'Test')
            .field('price', '500')
            .field('stock', '1');
        expect(res.status).toBe(401);
    });

    it('16. POST /api/items → 403 non-admin', async () => {
        const res = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${userToken}`)
            .field('name', 'Test Item')
            .field('description', 'Test')
            .field('price', '500')
            .field('stock', '1');
        expect(res.status).toBe(403);
    });

    it('17. POST /api/items → 400 missing required fields', async () => {
        const res = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', '')
            .field('description', '')
            .field('price', '0');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('18. POST /api/items → duplicate name generates unique slug', async () => {
        await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Unique Flower')
            .field('description', 'First one')
            .field('price', '999')
            .field('stock', '5')
            .field('isFeatured', 'false')
            .field('isAvailable', 'true');

        const res = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Unique Flower')
            .field('description', 'Second one')
            .field('price', '999')
            .field('stock', '5')
            .field('isFeatured', 'false')
            .field('isAvailable', 'true');

        expect(res.status).toBe(201);
        expect(res.body.data.slug).not.toBe('unique-flower'); // should be unique-flower-1
    });

    // ── PUT update item ────────────────────────────────────────────
    it('19. PUT /api/items/:id → 200 admin updates item', async () => {
        const res = await request(app)
            .put(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Updated Rose Bouquet')
            .field('description', 'Updated description')
            .field('price', '1800')
            .field('stock', '15')
            .field('isFeatured', 'true')
            .field('isAvailable', 'true');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.price).toBe(1800);
    });

    it('20. PUT /api/items/:id → 404 non-existent item', async () => {
        const res = await request(app)
            .put(`/api/items/507f191e810c19729de860ea`)
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Ghost Item')
            .field('description', 'Does not exist')
            .field('price', '100')
            .field('stock', '1')
            .field('isFeatured', 'false')
            .field('isAvailable', 'true');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('21. PUT /api/items/:id → handles existingImages and removedImages', async () => {
        const res = await request(app)
            .put(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Rose Bouquet Updated')
            .field('description', 'With image management')
            .field('price', '1500')
            .field('stock', '10')
            .field('isFeatured', 'false')
            .field('isAvailable', 'true')
            .field('existingImages', JSON.stringify(['/uploads/img1.jpg']))
            .field('removedImages', JSON.stringify(['/uploads/img1.jpg']));

        expect(res.status).toBe(200);
        expect(res.body.data.images).toEqual([]);
    });

    // ── DELETE item ────────────────────────────────────────────────
    it('22. DELETE /api/items/:id → 200 soft deletes item', async () => {
        const res = await request(app)
            .delete(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');

        // Confirm soft deleted — should not appear in public listing
        const check = await ItemModel.findById(itemId);
        expect(check?.isDeleted).toBe(true);
    });

    it('23. DELETE /api/items/:id → 404 non-existent item', async () => {
        const res = await request(app)
            .delete(`/api/items/507f191e810c19729de860ea`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('24. DELETE /api/items/:id → 401 unauthenticated', async () => {
        const res = await request(app).delete(`/api/items/${itemId}`);
        expect(res.status).toBe(401);
    });
});