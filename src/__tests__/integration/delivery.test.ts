// src/__tests__/integration/delivery.test.ts
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

describe('Delivery Integration Tests', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let userId: string;
    let orderId: string;
    let deliveryId: string;

    const deliveryDetails = {
        recipientName: 'Del Recipient',
        recipientPhone: '9812345678',
        address: { street: '1 Test St', city: 'Kathmandu', country: 'Nepal' },
    };

    const seedOrderWithDelivery = async () => {
        const item = await ItemModel.create({
            name: 'Del Item', slug: `del-item-${Date.now()}`,
            description: 'For delivery tests', price: 500, stock: 20,
            images: [], isFeatured: false, isAvailable: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        await CartModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: [{ type: 'product', refId: item._id, quantity: 1, unitPrice: 500, subtotal: 500 }],
            total: 500,
        });
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ paymentMethod: 'cash_on_delivery', deliveryDetails });
        orderId = res.body.data.order._id;
        deliveryId = res.body.data.delivery._id;
    };

    beforeEach(async () => {
        const admin = await UserModel.create({
            username: 'del_admin', email: 'del_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12), role: 'admin',
        });
        adminId = admin._id.toString();
        adminToken = jwt.sign(
            { id: adminId, email: admin.email, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'mero_secret', { expiresIn: '1h' }
        );

        const user = await UserModel.create({
            username: 'del_user', email: 'del_user@example.com',
            password: await bcryptjs.hash('UserPass123!', 12), role: 'user',
        });
        userId = user._id.toString();
        userToken = jwt.sign(
            { id: userId, email: user.email, username: user.username, role: 'user' },
            process.env.JWT_SECRET || 'mero_secret', { expiresIn: '1h' }
        );
    });

    // ── Auth guards ────────────────────────────────────────────────
    it('1. GET /api/admin/deliveries → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/admin/deliveries');
        expect(res.status).toBe(401);
    });

    it('2. GET /api/admin/deliveries → 403 non-admin', async () => {
        const res = await request(app)
            .get('/api/admin/deliveries')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });

    // ── GET all deliveries ─────────────────────────────────────────
    it('3. GET /api/admin/deliveries → 200 empty list', async () => {
        const res = await request(app)
            .get('/api/admin/deliveries')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('4. GET /api/admin/deliveries → 200 returns deliveries', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .get('/api/admin/deliveries')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.pagination).toBeDefined();
    });

    it('5. GET /api/admin/deliveries → filters by status', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .get('/api/admin/deliveries?status=pending')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.every((d: any) => d.status === 'pending')).toBe(true);
    });

    // ── GET by delivery ID ─────────────────────────────────────────
    it('6. GET /api/admin/deliveries/:id → 200 returns delivery', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .get(`/api/admin/deliveries/${deliveryId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(deliveryId);
    });

    it('7. GET /api/admin/deliveries/:id → 404 not found', async () => {
        const res = await request(app)
            .get('/api/admin/deliveries/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    // ── GET by order ID ────────────────────────────────────────────
    it('8. GET /api/admin/deliveries/order/:orderId → 200 returns delivery', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .get(`/api/admin/deliveries/order/${orderId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
    });

    it('9. GET /api/admin/deliveries/order/:orderId → 404 no delivery', async () => {
        const res = await request(app)
            .get('/api/admin/deliveries/order/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    // ── CREATE delivery manually ───────────────────────────────────
    it('10. POST /api/admin/deliveries → 400 missing fields', async () => {
        const res = await request(app)
            .post('/api/admin/deliveries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ orderId: '507f191e810c19729de860ea' });
        expect(res.status).toBe(400);
    });

    it('11. POST /api/admin/deliveries → 404 order not found', async () => {
        const res = await request(app)
            .post('/api/admin/deliveries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                orderId: '507f191e810c19729de860ea',
                recipientName: 'Test', recipientPhone: '9812345678',
                address: { street: '1 St', city: 'KTM', country: 'Nepal' },
            });
        expect(res.status).toBe(404);
    });

    it('12. POST /api/admin/deliveries → 409 delivery already exists', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .post('/api/admin/deliveries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                orderId,
                recipientName: 'Test', recipientPhone: '9812345678',
                address: { street: '1 St', city: 'KTM', country: 'Nepal' },
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toContain('already exists');
    });

    // ── UPDATE delivery ────────────────────────────────────────────
    it('13. PATCH /api/admin/deliveries/:id → 200 updates delivery details', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ recipientName: 'Updated Name', status: 'assigned' });
        expect(res.status).toBe(200);
        expect(res.body.data.recipientName).toBe('Updated Name');
        expect(res.body.data.status).toBe('assigned');
    });

    it('14. PATCH /api/admin/deliveries/:id → status in_transit syncs order to out_for_delivery', async () => {
        await seedOrderWithDelivery();
        // First advance order to confirmed→preparing
        await OrderModel.findByIdAndUpdate(orderId, { status: 'preparing' });

        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'in_transit' });
        expect(res.status).toBe(200);

        const order = await OrderModel.findById(orderId);
        expect(order?.status).toBe('out_for_delivery');
    });

    it('15. PATCH /api/admin/deliveries/:id → status delivered syncs order to delivered', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'delivered' });
        expect(res.status).toBe(200);

        const order = await OrderModel.findById(orderId);
        expect(order?.status).toBe('delivered');
    });

    it('16. PATCH /api/admin/deliveries/:id → 404 not found', async () => {
        const res = await request(app)
            .patch('/api/admin/deliveries/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'assigned' });
        expect(res.status).toBe(404);
    });

    // ── TRACKING update ────────────────────────────────────────────
    it('17. POST /api/admin/deliveries/:id/tracking → 200 adds tracking', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .post(`/api/admin/deliveries/${deliveryId}/tracking`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ message: 'Package picked up from warehouse' });
        expect(res.status).toBe(200);
        expect(res.body.data.trackingUpdates.length).toBeGreaterThan(1);
    });

    it('18. POST /api/admin/deliveries/:id/tracking → 400 missing message', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .post(`/api/admin/deliveries/${deliveryId}/tracking`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('message is required');
    });

    it('19. POST /api/admin/deliveries/:id/tracking → 404 not found', async () => {
        const res = await request(app)
            .post('/api/admin/deliveries/507f191e810c19729de860ea/tracking')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ message: 'Test' });
        expect(res.status).toBe(404);
    });

    // ── CANCEL delivery ────────────────────────────────────────────
    it('20. PATCH /api/admin/deliveries/:id/cancel → 200 cancels delivery', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Customer request' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('cancelled');
        expect(res.body.data.cancelReason).toBe('Customer request');
    });

    it('21. PATCH /api/admin/deliveries/:id/cancel → 400 already cancelled', async () => {
        await seedOrderWithDelivery();
        await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'First cancel' });

        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Second cancel' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('already cancelled');
    });

    it('22. PATCH /api/admin/deliveries/:id/cancel → 400 missing reason', async () => {
        await seedOrderWithDelivery();
        const res = await request(app)
            .patch(`/api/admin/deliveries/${deliveryId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('reason is required');
    });

    it('23. PATCH /api/admin/deliveries/:id/cancel → 404 not found', async () => {
        const res = await request(app)
            .patch('/api/admin/deliveries/507f191e810c19729de860ea/cancel')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Not found test' });
        expect(res.status).toBe(404);
    });
});