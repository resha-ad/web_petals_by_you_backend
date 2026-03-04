// src/__tests__/integration/notifications.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import { NotificationModel } from '../../models/notification.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Notifications Integration Tests', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let userId: string;
    let notificationId: string;

    const seedNotification = async (targetRole = 'all') => {
        const n = await NotificationModel.create({
            title: 'Test Notification',
            message: 'This is a test notification',
            type: 'info',
            targetRole,
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(adminId),
        });
        notificationId = n._id.toString();
        return n;
    };

    beforeEach(async () => {
        const admin = await UserModel.create({
            username: 'notif_admin', email: 'notif_admin@example.com',
            password: await bcryptjs.hash('AdminPass123!', 12), role: 'admin',
        });
        adminId = admin._id.toString();
        adminToken = jwt.sign(
            { id: adminId, email: admin.email, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'mero_secret', { expiresIn: '1h' }
        );

        const user = await UserModel.create({
            username: 'notif_user', email: 'notif_user@example.com',
            password: await bcryptjs.hash('UserPass123!', 12), role: 'user',
        });
        userId = user._id.toString();
        userToken = jwt.sign(
            { id: userId, email: user.email, username: user.username, role: 'user' },
            process.env.JWT_SECRET || 'mero_secret', { expiresIn: '1h' }
        );
    });

    // ── Admin: Create ──────────────────────────────────────────────
    it('1. POST /api/notifications → 401 unauthenticated', async () => {
        const res = await request(app).post('/api/notifications')
            .send({ title: 'Test', message: 'Test msg' });
        expect(res.status).toBe(401);
    });

    it('2. POST /api/notifications → 403 non-admin', async () => {
        const res = await request(app).post('/api/notifications')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Test', message: 'Test msg' });
        expect(res.status).toBe(403);
    });

    it('3. POST /api/notifications → 400 missing title/message', async () => {
        const res = await request(app).post('/api/notifications')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Title and message are required');
    });

    it('4. POST /api/notifications → 201 creates notification', async () => {
        const res = await request(app).post('/api/notifications')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Sale!', message: 'Big sale today', type: 'promo', targetRole: 'all' });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Sale!');
    });

    // ── Admin: Get all ─────────────────────────────────────────────
    it('5. GET /api/notifications → 200 returns all notifications', async () => {
        await seedNotification();
        const res = await request(app).get('/api/notifications')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.notifications.length).toBeGreaterThan(0);
        expect(res.body.total).toBeGreaterThan(0);
    });

    it('6. GET /api/notifications → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/notifications');
        expect(res.status).toBe(401);
    });

    // ── Admin: Update ──────────────────────────────────────────────
    it('7. PUT /api/notifications/:id → 200 updates notification', async () => {
        await seedNotification();
        const res = await request(app).put(`/api/notifications/${notificationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Updated Title', isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Updated Title');
        expect(res.body.data.isActive).toBe(false);
    });

    it('8. PUT /api/notifications/:id → 404 not found', async () => {
        const res = await request(app)
            .put('/api/notifications/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Ghost' });
        expect(res.status).toBe(404);
    });

    // ── Admin: Delete ──────────────────────────────────────────────
    it('9. DELETE /api/notifications/:id → 200 deletes notification', async () => {
        await seedNotification();
        const res = await request(app).delete(`/api/notifications/${notificationId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('deleted');
    });

    it('10. DELETE /api/notifications/:id → 404 not found', async () => {
        const res = await request(app)
            .delete('/api/notifications/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    // ── User: Get my notifications ─────────────────────────────────
    it('11. GET /api/notifications/my → 401 unauthenticated', async () => {
        const res = await request(app).get('/api/notifications/my');
        expect(res.status).toBe(401);
    });

    it('12. GET /api/notifications/my → 200 returns empty list', async () => {
        const res = await request(app).get('/api/notifications/my')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('13. GET /api/notifications/my → 200 returns active notifications for user', async () => {
        await seedNotification('all');
        const res = await request(app).get('/api/notifications/my')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].isRead).toBe(false);
    });

    // ── User: Mark as read ─────────────────────────────────────────
    it('14. PATCH /api/notifications/:id/read → 200 marks as read', async () => {
        await seedNotification();
        const res = await request(app)
            .patch(`/api/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('read');
    });

    it('15. PATCH /api/notifications/:id/read → 404 notification not found', async () => {
        const res = await request(app)
            .patch('/api/notifications/507f191e810c19729de860ea/read')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
    });

    // ── User: Mark all as read ─────────────────────────────────────
    it('16. PATCH /api/notifications/read-all → 200 marks all as read', async () => {
        await seedNotification();
        const res = await request(app)
            .patch('/api/notifications/read-all')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('read');
    });

    // ── User: Clear notification ───────────────────────────────────
    it('17. PATCH /api/notifications/:id/clear → 200 clears notification', async () => {
        await seedNotification();
        const res = await request(app)
            .patch(`/api/notifications/${notificationId}/clear`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('cleared');
    });

    it('18. PATCH /api/notifications/:id/clear → 404 notification not found', async () => {
        const res = await request(app)
            .patch('/api/notifications/507f191e810c19729de860ea/clear')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
    });

    // ── User: Clear all ────────────────────────────────────────────
    it('19. PATCH /api/notifications/clear-all → 200 clears all', async () => {
        await seedNotification();
        const res = await request(app)
            .patch('/api/notifications/clear-all')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('cleared');
    });

    it('20. GET /api/notifications/my → cleared notification is hidden', async () => {
        await seedNotification();
        await request(app)
            .patch(`/api/notifications/${notificationId}/clear`)
            .set('Authorization', `Bearer ${userToken}`);

        const res = await request(app).get('/api/notifications/my')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
    });
});