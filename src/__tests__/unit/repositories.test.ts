// src/__tests__/unit/repositories.test.ts
import { UserRepository } from '../../repositories/user.repository';
import { OrderRepository } from '../../repositories/order.repository';
import { CustomBouquetRepository } from '../../repositories/customBouquet.repository';
import { CartRepository } from '../../repositories/cart.repository';
import { UserModel } from '../../models/user.model';
import { OrderModel } from '../../models/order.model';
import { CustomBouquetModel } from '../../models/customBouquet.model';
import { CartModel } from '../../models/cart.model';
import mongoose from 'mongoose';

describe('Repository Unit Tests', () => {
    afterEach(() => jest.restoreAllMocks());

    // ── UserRepository ────────────────────────────────────────────
    describe('UserRepository', () => {
        const repo = new UserRepository();

        it('findAll returns all users', async () => {
            jest.spyOn(UserModel, 'find').mockResolvedValue([{ username: 'u' }] as any);
            const result = await repo.findAll();
            expect(result).toHaveLength(1);
        });

        it('remove returns false if user not found', async () => {
            jest.spyOn(UserModel, 'findByIdAndDelete').mockResolvedValue(null);
            const result = await repo.remove('nonexistent-id');
            expect(result).toBe(false);
        });

        it('remove returns true if user deleted', async () => {
            jest.spyOn(UserModel, 'findByIdAndDelete').mockResolvedValue({ _id: 'id' } as any);
            const result = await repo.remove('id');
            expect(result).toBe(true);
        });
    });

    // ── OrderRepository ───────────────────────────────────────────
    describe('OrderRepository', () => {
        const repo = new OrderRepository();

        it('findByUserId filters by userId with pagination', async () => {
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };
            jest.spyOn(OrderModel, 'find').mockReturnValue(mockQuery as any);
            jest.spyOn(OrderModel, 'countDocuments').mockResolvedValue(0);
            const result = await repo.findByUserId('uid', 1, 10);
            expect(result.orders).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('findAll applies status filter', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };
            jest.spyOn(OrderModel, 'find').mockReturnValue(mockQuery as any);
            jest.spyOn(OrderModel, 'countDocuments').mockResolvedValue(0);
            const result = await repo.findAll({ page: 1, limit: 10, status: 'pending' });
            expect(OrderModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
        });
    });

    // ── CustomBouquetRepository ───────────────────────────────────
    describe('CustomBouquetRepository', () => {
        const repo = new CustomBouquetRepository();

        it('findById returns null for non-existent id', async () => {
            jest.spyOn(CustomBouquetModel, 'findById').mockResolvedValue(null);
            const result = await repo.findById('nonexistent');
            expect(result).toBeNull();
        });

        it('findById returns bouquet when found', async () => {
            const bouquet = { _id: 'bid', totalPrice: 500 } as any;
            jest.spyOn(CustomBouquetModel, 'findById').mockResolvedValue(bouquet);
            const result = await repo.findById('bid');
            expect(result?.totalPrice).toBe(500);
        });
    });

    // ── CartRepository edge cases ─────────────────────────────────
    describe('CartRepository', () => {
        const repo = new CartRepository();

        it('removeItem returns null if cart not found', async () => {
            jest.spyOn(CartModel, 'findOne').mockResolvedValue(null);
            const result = await repo.removeItem('uid', 'refid');
            expect(result).toBeNull();
        });

        it('updateQuantity returns null if cart not found', async () => {
            jest.spyOn(CartModel, 'findOne').mockResolvedValue(null);
            const result = await repo.updateQuantity('uid', 'refid', 2);
            expect(result).toBeNull();
        });

        it('updateQuantity returns null if item not in cart', async () => {
            jest.spyOn(CartModel, 'findOne').mockResolvedValue({
                items: [],
                save: jest.fn(),
            } as any);
            const result = await repo.updateQuantity('uid', 'refid', 2);
            expect(result).toBeNull();
        });

        it('clearCart returns null if cart not found', async () => {
            jest.spyOn(CartModel, 'findOne').mockResolvedValue(null);
            const result = await repo.clearCart('uid');
            expect(result).toBeNull();
        });
    });
});