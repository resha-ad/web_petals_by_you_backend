// src/__tests__/integration/favorites.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import { ItemModel } from '../../models/item.model';
import { FavoritesModel } from '../../models/favorites.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Favorites Integration Tests', () => {
    let userToken: string;
    let userId: string;
    let adminId: string;
    let itemId: string;

    beforeEach(async () => {
        const admin = await UserModel.create({
            username: 'fav_admin',
            email: 'fav_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12),
            role: 'admin',
        });
        adminId = admin._id.toString();

        const user = await UserModel.create({
            username: 'fav_user',
            email: 'fav_user@example.com',
            password: await bcryptjs.hash('UserPass123!', 12),
            role: 'user',
        });
        userId = user._id.toString();
        userToken = jwt.sign(
            { id: userId, email: user.email, username: user.username, role: 'user' },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        const item = await ItemModel.create({
            name: 'Fav Rose',
            slug: 'fav-rose',
            description: 'For favorites tests',
            price: 800,
            stock: 10,
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        itemId = item._id.toString();
    });

    // ── GET favorites ──────────────────────────────────────────────
    it('1. GET /api/favorites → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/favorites');
        expect(res.status).toBe(401);
    });

    it('2. GET /api/favorites → 200 empty for new user', async () => {
        const res = await request(app)
            .get('/api/favorites')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
    });

    it('3. GET /api/favorites → 200 returns existing favorites', async () => {
        await FavoritesModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: [{ type: 'product', refId: new mongoose.Types.ObjectId(itemId) }],
        });
        const res = await request(app)
            .get('/api/favorites')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(1);
    });

    // ── ADD item ───────────────────────────────────────────────────
    it('4. POST /api/favorites/add → 401 unauthenticated', async () => {
        const res = await request(app)
            .post('/api/favorites/add')
            .send({ type: 'product', refId: itemId });
        expect(res.status).toBe(401);
    });

    it('5. POST /api/favorites/add → 200 adds product', async () => {
        const res = await request(app)
            .post('/api/favorites/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ type: 'product', refId: itemId });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items.length).toBe(1);
    });

    it('6. POST /api/favorites/add → 200 no duplicate on re-add', async () => {
        await request(app)
            .post('/api/favorites/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ type: 'product', refId: itemId });

        const res = await request(app)
            .post('/api/favorites/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ type: 'product', refId: itemId });

        expect(res.status).toBe(200);
        // Should still be 1, not 2
        expect(res.body.data.items.length).toBe(1);
    });

    it('7. POST /api/favorites/add → 404 non-existent product', async () => {
        const res = await request(app)
            .post('/api/favorites/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ type: 'product', refId: '507f191e810c19729de860ea' });
        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Product not found');
    });

    // ── REMOVE item ────────────────────────────────────────────────
    it('8. DELETE /api/favorites/remove/:refId → 401 unauthenticated', async () => {
        const res = await request(app).delete(`/api/favorites/remove/${itemId}`);
        expect(res.status).toBe(401);
    });

    it('9. DELETE /api/favorites/remove/:refId → 400 invalid refId', async () => {
        const res = await request(app)
            .delete('/api/favorites/remove/not-valid-id')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Invalid refId');
    });

    it('10. DELETE /api/favorites/remove/:refId → 404 no favorites record', async () => {
        const res = await request(app)
            .delete(`/api/favorites/remove/${itemId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Favorites not found');
    });

    it('11. DELETE /api/favorites/remove/:refId → 200 removes item', async () => {
        await request(app)
            .post('/api/favorites/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ type: 'product', refId: itemId });

        const res = await request(app)
            .delete(`/api/favorites/remove/${itemId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(0);
    });

    it('12. DELETE /api/favorites/remove/:refId → 200 removing non-existent item is safe', async () => {
        // Create favorites but with a different item
        await FavoritesModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: [],
        });

        const otherItemId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/api/favorites/remove/${otherItemId}`)
            .set('Authorization', `Bearer ${userToken}`);

        // Removing something not in list is a no-op, still 200
        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(0);
    });
});