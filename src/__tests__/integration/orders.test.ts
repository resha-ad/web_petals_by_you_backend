// src/__tests__/integration/orders.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import { ItemModel } from '../../models/item.model';
import { CartModel } from '../../models/cart.model';
import { OrderModel } from '../../models/order.model';
import { DeliveryModel } from '../../models/delivery.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Orders Integration Tests', () => {
    let userToken: string;
    let adminToken: string;
    let userId: string;
    let adminId: string;
    let itemId: string;

    const deliveryDetails = {
        recipientName: 'Test Recipient',
        recipientPhone: '9812345678',
        address: {
            street: '123 Flower Lane',
            city: 'Kathmandu',
            country: 'Nepal',
        },
    };

    // Helper: seed a cart with one item for the user
    const seedCart = async () => {
        await CartModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: [{
                type: 'product',
                refId: new mongoose.Types.ObjectId(itemId),
                quantity: 2,
                unitPrice: 1000,
                subtotal: 2000,
            }],
            total: 2000,
        });
    };

    beforeEach(async () => {
        const admin = await UserModel.create({
            username: 'order_admin',
            email: 'order_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12),
            role: 'admin',
        });
        adminId = admin._id.toString();
        adminToken = jwt.sign(
            { id: adminId, email: admin.email, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        const user = await UserModel.create({
            username: 'order_user',
            email: 'order_user@example.com',
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
            name: 'Order Test Rose',
            slug: 'order-test-rose',
            description: 'For order tests',
            price: 1000,
            stock: 50,
            images: [],
            isFeatured: false,
            isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        itemId = item._id.toString();
    });

    // ── Place order ────────────────────────────────────────────────
    it('1. POST /api/orders → 401 unauthenticated', async () => {
        const res = await request(app).post('/api/orders').send({});
        expect(res.status).toBe(401);
    });

    it('2. POST /api/orders → 400 empty cart', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('cart is empty');
    });

    it('3. POST /api/orders → 400 missing paymentMethod', async () => {
        await seedCart();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ deliveryDetails });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Payment method');
    });

    it('4. POST /api/orders → 400 missing deliveryDetails', async () => {
        await seedCart();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Delivery details');
    });

    it('5. POST /api/orders → 201 places order successfully (COD)', async () => {
        await seedCart();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails, notes: 'Please ring bell' });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.order.totalAmount).toBe(2000);
        expect(res.body.data.order.paymentStatus).toBe('unpaid');
        expect(res.body.data.delivery).toBeTruthy();
        // Cart should be cleared
        const cart = await CartModel.findOne({ userId });
        expect(cart?.items.length).toBe(0);
    });

    it('6. POST /api/orders → 201 places order (online payment = paid)', async () => {
        await seedCart();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'online', deliveryDetails });
        expect(res.status).toBe(201);
        expect(res.body.data.order.paymentStatus).toBe('paid');
    });

    // ── Get my orders ──────────────────────────────────────────────
    it('7. GET /api/orders → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/orders');
        expect(res.status).toBe(401);
    });

    it('8. GET /api/orders → 200 returns empty list', async () => {
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.total).toBe(0);
    });

    it('9. GET /api/orders → 200 returns my orders paginated', async () => {
        await seedCart();
        await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });

        const res = await request(app)
            .get('/api/orders?page=1&limit=5')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.pagination.total).toBe(1);
    });

    // ── Get single order ───────────────────────────────────────────
    it('10. GET /api/orders/:id → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/orders/507f191e810c19729de860ea');
        expect(res.status).toBe(401);
    });

    it('11. GET /api/orders/:id → 404 non-existent order', async () => {
        const res = await request(app)
            .get('/api/orders/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
    });

    it('12. GET /api/orders/:id → 200 returns own order with delivery', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.order._id).toBe(orderId);
        expect(res.body.data.delivery).toBeTruthy();
    });

    it('13. GET /api/orders/:id → 403 other user cannot access', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const otherUser = await UserModel.create({
            username: 'other_order_user',
            email: 'other_order@example.com',
            password: await bcryptjs.hash('Pass123!', 12),
            role: 'user',
        });
        const otherToken = jwt.sign(
            { id: otherUser._id.toString(), role: 'user', email: otherUser.email, username: otherUser.username },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );
        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${otherToken}`);
        expect(res.status).toBe(403);
    });

    // ── Cancel my order ────────────────────────────────────────────
    it('14. PATCH /api/orders/:id/cancel → 200 cancels pending order', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ reason: 'Changed my mind' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');
        expect(res.body.data.cancelledBy).toBe('user');
        expect(res.body.data.cancelReason).toBe('Changed my mind');
    });

    it('15. PATCH /api/orders/:id/cancel → 400 cannot cancel non-pending order', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        // Admin advances to confirmed
        await OrderModel.findByIdAndUpdate(orderId, { status: 'confirmed' });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ reason: 'Too late' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('confirmed');
    });

    it('16. PATCH /api/orders/:id/cancel → 403 cannot cancel other user order', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const otherUser = await UserModel.create({
            username: 'cancel_other',
            email: 'cancel_other@example.com',
            password: await bcryptjs.hash('Pass123!', 12),
            role: 'user',
        });
        const otherToken = jwt.sign(
            { id: otherUser._id.toString(), role: 'user', email: otherUser.email, username: otherUser.username },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );
        const res = await request(app)
            .patch(`/api/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ reason: 'Not mine' });
        expect(res.status).toBe(403);
    });

    // ── Admin: Get all orders ──────────────────────────────────────
    it('17. GET /api/admin/orders → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/admin/orders');
        expect(res.status).toBe(401);
    });

    it('18. GET /api/admin/orders → 403 non-admin', async () => {
        const res = await request(app)
            .get('/api/admin/orders')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });

    it('19. GET /api/admin/orders → 200 returns all orders', async () => {
        await seedCart();
        await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });

        const res = await request(app)
            .get('/api/admin/orders')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.pagination).toBeDefined();
    });

    it('20. GET /api/admin/orders → filters by status', async () => {
        await seedCart();
        await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });

        const res = await request(app)
            .get('/api/admin/orders?status=pending')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.every((o: any) => o.status === 'pending')).toBe(true);
    });

    // ── Admin: Get single order ────────────────────────────────────
    it('21. GET /api/admin/orders/:id → 200 returns order', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .get(`/api/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(orderId);
    });

    it('22. GET /api/admin/orders/:id → 404 not found', async () => {
        const res = await request(app)
            .get('/api/admin/orders/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    // ── Admin: Update order status ─────────────────────────────────
    it('23. PATCH /api/admin/orders/:id/status → 200 pending→confirmed', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'confirmed' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('confirmed');
    });

    it('24. PATCH /api/admin/orders/:id/status → 400 invalid transition', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'delivered' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Cannot transition');
    });

    it('25. PATCH /api/admin/orders/:id/status → 400 missing status', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('status is required');
    });

    // ── Admin: Cancel order ────────────────────────────────────────
    it('26. PATCH /api/admin/orders/:id/cancel → 200 cancels order', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Out of stock' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');
        expect(res.body.data.cancelledBy).toBe('admin');
    });

    it('27. PATCH /api/admin/orders/:id/cancel → 400 already cancelled', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        await request(app)
            .patch(`/api/admin/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'First cancel' });

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Second cancel' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('already cancelled');
    });

    it('28. PATCH /api/admin/orders/:id/cancel → 400 missing reason', async () => {
        await seedCart();
        const placed = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        const orderId = placed.body.data.order._id;

        const res = await request(app)
            .patch(`/api/admin/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('reason is required');
    });

    it('29. PATCH /api/admin/orders/:id/cancel → 404 order not found', async () => {
        const res = await request(app)
            .patch('/api/admin/orders/507f191e810c19729de860ea/cancel')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Not found test' });
        expect(res.status).toBe(404);
    });
});