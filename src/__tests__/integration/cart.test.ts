// src/__tests__/integration/cart.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import { ItemModel } from '../../models/item.model';
import { CartModel } from '../../models/cart.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Cart Integration Tests', () => {
    let userToken: string;
    let userId: string;
    let itemId: string;
    let adminId: string;

    beforeEach(async () => {
        const admin = await UserModel.create({
            username: 'cart_admin',
            email: 'cart_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12),
            role: 'admin',
        });
        adminId = admin._id.toString();

        const user = await UserModel.create({
            username: 'cart_user',
            email: 'cart_user@example.com',
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
            name: 'Cart Test Rose',
            slug: 'cart-test-rose',
            description: 'For cart tests',
            price: 1000,
            discountPrice: 900,
            stock: 20,
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        itemId = item._id.toString();
    });

    // ── GET cart ───────────────────────────────────────────────────
    it('1. GET /api/cart → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/cart');
        expect(res.status).toBe(401);
    });

    it('2. GET /api/cart → 200 empty cart for new user', async () => {
        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
    });

    it('3. GET /api/cart → 200 returns existing cart', async () => {
        // Seed a cart first
        await CartModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: [],
            total: 0,
        });
        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // ── ADD product ────────────────────────────────────────────────
    it('4. POST /api/cart/add-product → 401 unauthenticated', async () => {
        const res = await request(app)
            .post('/api/cart/add-product')
            .send({ itemId, quantity: 1 });
        expect(res.status).toBe(401);
    });

    it('5. POST /api/cart/add-product → 200 adds product', async () => {
        const res = await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId, quantity: 2 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items.length).toBe(1);
        expect(res.body.data.items[0].quantity).toBe(2);
        expect(res.body.data.total).toBe(1800); // discountPrice 900 * 2
    });

    it('6. POST /api/cart/add-product → 404 non-existent item', async () => {
        const res = await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId: '507f191e810c19729de860ea', quantity: 1 });
        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Product not found');
    });

    it('7. POST /api/cart/add-product → 400 insufficient stock', async () => {
        const res = await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId, quantity: 999 });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Insufficient stock');
    });

    it('8. POST /api/cart/add-product → uses regular price when no discountPrice', async () => {
        const noDiscountItem = await ItemModel.create({
            name: 'No Discount Flower',
            slug: 'no-discount-flower',
            description: 'No discount',
            price: 500,
            stock: 10,
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        const res = await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId: noDiscountItem._id.toString(), quantity: 1 });
        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(500);
    });

    // ── UPDATE quantity ────────────────────────────────────────────
    it('9. PUT /api/cart/update-quantity → 200 updates quantity', async () => {
        // First add item
        await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId, quantity: 1 });

        const cart = await CartModel.findOne({ userId });
        const refId = cart!.items[0].refId.toString();

        const res = await request(app)
            .put('/api/cart/update-quantity')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ refId, quantity: 3 });

        expect(res.status).toBe(200);
        expect(res.body.data.items[0].quantity).toBe(3);
        expect(res.body.data.total).toBe(2700); // 900 * 3
    });

    it('10. PUT /api/cart/update-quantity → 404 cart not found', async () => {
        const res = await request(app)
            .put('/api/cart/update-quantity')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ refId: itemId, quantity: 2 });
        expect(res.status).toBe(404);
    });

    it('11. PUT /api/cart/update-quantity → 401 unauthenticated', async () => {
        const res = await request(app)
            .put('/api/cart/update-quantity')
            .send({ refId: itemId, quantity: 2 });
        expect(res.status).toBe(401);
    });

    // ── REMOVE item ────────────────────────────────────────────────
    it('12. DELETE /api/cart/remove/:refId → 200 removes item', async () => {
        await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId, quantity: 1 });

        const cart = await CartModel.findOne({ userId });
        const refId = cart!.items[0].refId.toString();

        const res = await request(app)
            .delete(`/api/cart/remove/${refId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(0);
        expect(res.body.data.total).toBe(0);
    });

    it('13. DELETE /api/cart/remove/:refId → 400 invalid refId', async () => {
        const res = await request(app)
            .delete('/api/cart/remove/not-a-valid-id')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Invalid refId');
    });

    it('14. DELETE /api/cart/remove/:refId → 404 cart not found', async () => {
        const res = await request(app)
            .delete(`/api/cart/remove/${itemId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
    });

    it('15. DELETE /api/cart/remove/:refId → 401 unauthenticated', async () => {
        const res = await request(app)
            .delete(`/api/cart/remove/${itemId}`);
        expect(res.status).toBe(401);
    });

    // ── CLEAR cart ─────────────────────────────────────────────────
    it('16. DELETE /api/cart/clear → 200 clears cart', async () => {
        await request(app)
            .post('/api/cart/add-product')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemId, quantity: 2 });

        const res = await request(app)
            .delete('/api/cart/clear')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(0);
        expect(res.body.data.total).toBe(0);
    });

    it('17. DELETE /api/cart/clear → 404 no cart to clear', async () => {
        const res = await request(app)
            .delete('/api/cart/clear')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
    });

    it('18. DELETE /api/cart/clear → 401 unauthenticated', async () => {
        const res = await request(app).delete('/api/cart/clear');
        expect(res.status).toBe(401);
    });
});