// src/__tests__/integration/admin-users.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Admin Users Integration Tests', () => {
    let adminToken: string = '';
    let targetUserId: string | null = null;

    const getUniqueSuffix = () => Date.now().toString() + Math.random().toString(36).slice(2, 8);

    beforeEach(async () => {
        const suffix = getUniqueSuffix();

        // Clean any leftover from previous runs (broad cleanup)
        await UserModel.deleteMany({
            email: { $regex: /@example\.com$/ },
        });

        // Create fresh admin
        const adminEmail = `admin_${suffix}@example.com`;
        const hashedAdmin = await bcryptjs.hash('AdminPass2025!', 12);
        const adminUser = await UserModel.create({
            username: `admin_${suffix}`,
            email: adminEmail,
            password: hashedAdmin,
            role: 'admin',
        });

        adminToken = jwt.sign(
            {
                id: adminUser._id.toString(),
                email: adminUser.email,
                username: adminUser.username,
                role: adminUser.role,
            },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        // Create fresh target user for read/update/delete
        const targetEmail = `target_${suffix}@example.com`;
        const hashedTarget = await bcryptjs.hash('ValidPass123!', 12);
        const targetUser = await UserModel.create({
            username: `target_${suffix}`,
            email: targetEmail,
            password: hashedTarget,
            firstName: 'Target',
            lastName: 'User',
            role: 'user',
        });

        targetUserId = targetUser._id.toString();
    });

    // 1–4: Authorization
    it('1. GET /api/admin/users → 401 no token', async () => {
        const res = await request(app).get('/api/admin/users?page=1&size=5');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('No token provided');
    });

    it('2. GET /api/admin/users → 403 non-admin', async () => {
        const suffix = getUniqueSuffix();
        const normalUser = await UserModel.create({
            username: `normal_${suffix}`,
            email: `normal_${suffix}@example.com`,
            password: await bcryptjs.hash('NormalPass123!', 12),
            role: 'user',
        });

        const normalToken = jwt.sign(
            { id: normalUser._id.toString(), role: 'user' },
            process.env.JWT_SECRET || 'mero_secret',
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/admin/users?page=1&size=5')
            .set('Authorization', `Bearer ${normalToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Admin access required');
    });

    it('3. GET /api/admin/users → 200 with pagination for admin', async () => {
        const res = await request(app)
            .get('/api/admin/users?page=1&size=5')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('Users retrieved');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(5);
        expect(typeof res.body.pagination.total).toBe('number');
        expect(typeof res.body.pagination.totalPages).toBe('number');
    });

    it('4. GET /api/admin/users → filters by search', async () => {
        const suffix = getUniqueSuffix();
        await UserModel.create({
            username: `searchable_${suffix}`,
            email: `searchme_${suffix}@example.com`,
            password: await bcryptjs.hash('ValidPass123!', 12),
            role: 'user',
        });

        const res = await request(app)
            .get(`/api/admin/users?search=searchme_${suffix}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.some((u: any) => u.email.includes(`searchme_${suffix}`))).toBe(true);
    });

    // 5–8: Create
    it('5. POST /api/admin/users → creates user', async () => {
        const suffix = getUniqueSuffix();
        const payload = {
            username: `create_test_${suffix}`,
            email: `create_${suffix}@example.com`,
            password: 'ValidPass123!',
            confirmPassword: 'ValidPass123!',
            firstName: 'Create',
            lastName: 'Test',
        };

        const res = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('User created successfully');
        expect(res.body.data.email).toBe(payload.email);
    });

    it('6. POST /api/admin/users → 409 duplicate email', async () => {
        const suffix = getUniqueSuffix();
        const payload = {
            username: `dup_email_${suffix}`,
            email: `dup_${suffix}@example.com`,
            password: 'ValidPass123!',
            confirmPassword: 'ValidPass123!',
            firstName: 'Dup',
            lastName: 'Email',
        };

        await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        const res = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Email already in use');
    });

    it('7. POST /api/admin/users → 409 duplicate username', async () => {
        const suffix = getUniqueSuffix();
        const payload = {
            username: `dup_username_${suffix}`,
            email: `dup_email_${suffix}@example.com`,
            password: 'ValidPass123!',
            confirmPassword: 'ValidPass123!',
            firstName: 'Dup',
            lastName: 'Username',
        };

        await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        const dupUsername = {
            ...payload,
            email: `different_${suffix}@example.com`,
        };

        const res = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dupUsername);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Username already taken');
    });

    it('8. POST /api/admin/users → 400 missing required fields', async () => {
        const invalid = {
            username: 'invalid_test',
            email: '',
            password: 'ValidPass123!',
            confirmPassword: 'ValidPass123!',
        };

        const res = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalid);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    // 9–13: Read/Update/Delete
    it('9. GET /api/admin/users/:id → returns user', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(targetUserId);
    });

    it('10. GET /api/admin/users/:id → 404 invalid ID', async () => {
        const res = await request(app)
            .get('/api/admin/users/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('User not found');
    });

    it('11. PUT /api/admin/users/:id → updates user', async () => {
        const updateData = {
            firstName: 'UpdatedFirst',
            lastName: 'UpdatedLast',
            email: 'updated_test@example.com',
        };

        const res = await request(app)
            .put(`/api/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.firstName).toBe('UpdatedFirst');
    });

    it('12. DELETE /api/admin/users/:id → deletes user', async () => {
        const res = await request(app)
            .delete(`/api/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');

        const check = await UserModel.findById(targetUserId);
        expect(check).toBeNull();
    });

    it('13. DELETE /api/admin/users/:id → 404 non-existent', async () => {
        const res = await request(app)
            .delete('/api/admin/users/507f191e810c19729de860ea')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('not found');
    });

    // 14–15: Pagination
    it('14. GET /api/admin/users → page=2 with many users', async () => {
        for (let i = 1; i <= 12; i++) {
            await UserModel.create({
                username: `extra_${i}`,
                email: `extra_${i}@example.com`,
                password: await bcryptjs.hash('ValidPass123!', 12),
                role: 'user',
            });
        }

        const res = await request(app)
            .get('/api/admin/users?page=2&size=5')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pagination.page).toBe(2);
        expect(res.body.pagination.limit).toBe(5);
        expect(res.body.data.length).toBe(5);
        expect(res.body.pagination.totalPages).toBeGreaterThan(2);
    });

    it('15. GET /api/admin/users → empty on high page', async () => {
        const res = await request(app)
            .get('/api/admin/users?page=999&size=5')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
        expect(res.body.pagination.page).toBe(999);
        expect(res.body.pagination.totalPages).toBeGreaterThan(0);
    });
});