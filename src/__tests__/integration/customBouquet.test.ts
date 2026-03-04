// src/__tests__/integration/customBouquet.test.ts
import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/user.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('CustomBouquet Integration Tests', () => {
    let userToken: string;
    let userId: string;

    const validPayload = {
        flowers: [{ flowerId: 'f1', name: 'Rose', count: 3, pricePerStem: 100 }],
        wrapping: { id: 'w1', name: 'Silk', price: 200 },
        note: 'Happy Birthday',
        recipientName: 'Jane',
        totalPrice: 500,
    };

    beforeEach(async () => {
        const user = await UserModel.create({
            username: 'bouquet_user', email: 'bouquet_user@example.com',
            password: await bcryptjs.hash('UserPass123!', 12), role: 'user',
        });
        userId = user._id.toString();
        userToken = jwt.sign(
            { id: userId, email: user.email, username: user.username, role: 'user' },
            process.env.JWT_SECRET || 'mero_secret', { expiresIn: '1h' }
        );
    });

    it('1. POST /api/custom-bouquets → 401 unauthenticated', async () => {
        const res = await request(app).post('/api/custom-bouquets').send(validPayload);
        expect(res.status).toBe(401);
    });

    it('2. POST /api/custom-bouquets → 201 creates bouquet and adds to cart', async () => {
        const res = await request(app)
            .post('/api/custom-bouquets')
            .set('Authorization', `Bearer ${userToken}`)
            .send(validPayload);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bouquet.totalPrice).toBe(500);
        expect(res.body.data.cart.items.length).toBe(1);
        expect(res.body.data.cart.items[0].type).toBe('custom');
    });

    it('3. POST /api/custom-bouquets → 400 missing required fields', async () => {
        const res = await request(app)
            .post('/api/custom-bouquets')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ note: 'Missing flowers and wrapping' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Invalid bouquet data');
    });

    it('4. POST /api/custom-bouquets → 400 empty flowers array', async () => {
        const res = await request(app)
            .post('/api/custom-bouquets')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ ...validPayload, flowers: [] });
        expect(res.status).toBe(400);
    });

    it('5. POST /api/custom-bouquets → cart total equals bouquet totalPrice', async () => {
        const res = await request(app)
            .post('/api/custom-bouquets')
            .set('Authorization', `Bearer ${userToken}`)
            .send(validPayload);
        expect(res.status).toBe(201);
        expect(res.body.data.cart.total).toBe(validPayload.totalPrice);
    });
});