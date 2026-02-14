// src/__tests__/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

describe('Auth Integration Tests', () => {
    const testUser = {
        username: 'testuser_auth',
        email: 'auth_test@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
        firstName: 'Auth',
        lastName: 'Tester',
    };

    let resetToken: string | null = null; // will store token for reset test

    beforeEach(async () => {
        await UserModel.deleteMany({
            $or: [{ email: testUser.email }, { username: testUser.username }],
        });
    });

    afterEach(async () => {
        await UserModel.deleteMany({
            $or: [{ email: testUser.email }, { username: testUser.username }],
        });
    });

    // ────────────────────────────────────────────────
    // Register Tests
    // ────────────────────────────────────────────────
    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('Account created');
        expect(res.body.data).toHaveProperty('email', testUser.email);
    });

    it('should fail registration if passwords do not match', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...testUser, confirmPassword: 'DifferentPass!' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should fail registration with duplicate email', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...testUser, username: 'differentuser' });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('already registered');
    });

    it('should fail registration with duplicate username', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...testUser, email: 'different@email.com' });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('already taken');
    });

    // ────────────────────────────────────────────────
    // Login Tests
    // ────────────────────────────────────────────────
    it('should login successfully with correct credentials', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        expect(res.body.data.email).toBe(testUser.email);
    });

    it('should fail login with wrong password', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'WrongPass123!',
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid');
    });

    it('should fail login with non-existent email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'SomePass123!',
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid');
    });

    // ────────────────────────────────────────────────
    // Forgot Password Tests
    // ────────────────────────────────────────────────
    it('should respond 200 for forgot-password even if email does not exist (security)', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'unknown@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('reset link has been sent');
    });

    it('should send reset token when email exists', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: testUser.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Check in DB that token was saved
        const user = await UserModel.findOne({ email: testUser.email });
        expect(user).toBeTruthy();
        expect(user?.resetPasswordToken).toBeTruthy();
        expect(user?.resetPasswordExpires).toBeTruthy();

        // Save token for next test
        resetToken = crypto
            .createHash('sha256')
            .update(user!.resetPasswordToken!)
            .digest('hex'); // we use hashed version in DB
    });

    // ────────────────────────────────────────────────
    // Reset Password Tests
    // ────────────────────────────────────────────────
    it('should reset password successfully with valid token', async () => {
        // 1. Register user
        await request(app)
            .post('/api/auth/register')
            .send(testUser);

        // 2. Generate plain token ourselves (simulate email link)
        const plainResetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(plainResetToken).digest('hex');

        // 3. Manually set token in DB (simulate forgot-password effect)
        const userBefore = await UserModel.findOneAndUpdate(
            { email: testUser.email },
            {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
            { new: true }
        );

        expect(userBefore).toBeTruthy();

        const oldPasswordHash = userBefore!.password;

        // 4. Send PLAIN token to reset endpoint
        const newPassword = 'NewStrongPass456!';

        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: plainResetToken,   // ← plain token
                newPassword,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('reset successful');

        // 5. Verify changes
        const userAfter = await UserModel.findOne({ email: testUser.email });
        expect(userAfter?.password).not.toBe(oldPasswordHash);
        expect(userAfter?.resetPasswordToken).toBeNull();
        expect(userAfter?.resetPasswordExpires).toBeNull();
    });

    it('should fail reset with invalid token', async () => {
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: 'invalid-token-here',
                newPassword: 'SomeNewPass789!',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid or expired');
    });

    it('should fail reset with missing token or password', async () => {
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ newPassword: 'NewPass!' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});