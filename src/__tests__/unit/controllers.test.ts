// src/__tests__/unit/controllers.test.ts
import { CartController } from '../../controllers/cart.controller';
import { FavoritesController } from '../../controllers/favorites.controller';
import { ItemController } from '../../controllers/item.controller';
import { NotificationController } from '../../controllers/notification.controller';
import { AdminOrderController } from '../../controllers/admin/admin.order.controller';
import { AdminDeliveryController } from '../../controllers/admin/admin.delivery.controller';
import { AdminUserController } from '../../controllers/admin/user.controller';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { ItemModel } from '../../models/item.model';

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

afterEach(() => jest.restoreAllMocks());

describe('Controller error branch coverage', () => {

    // ── CartController ────────────────────────────────────────────
    describe('CartController', () => {
        const ctrl = new CartController();

        it('getCart returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.getCart({ user: null } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('addProduct returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.addProduct({ user: null, body: {} } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    // ── FavoritesController ───────────────────────────────────────
    describe('FavoritesController', () => {
        const ctrl = new FavoritesController();

        it('getFavorites returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.getFavorites({ user: null } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('addItem returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.addItem({ user: null, body: {} } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    // ── ItemController ────────────────────────────────────────────
    describe('ItemController', () => {
        const ctrl = new ItemController();

        it('getById returns 404 for non-existent item', async () => {
            jest.spyOn(ItemModel, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            } as any);
            const res = mockRes();
            await ctrl.getById({ params: { id: '507f191e810c19729de860ea' } } as any, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('getSingleItem returns 400 for array id', async () => {
            const res = mockRes();
            await ctrl.getSingleItem({ params: { id: ['a', 'b'] as any } } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('updateItem returns 400 for array id', async () => {
            const res = mockRes();
            await ctrl.updateItem({ params: { id: ['a', 'b'] as any }, user: { id: 'uid' }, body: {}, files: [] } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('deleteItem returns 400 for array id', async () => {
            const res = mockRes();
            await ctrl.deleteItem({ params: { id: ['a', 'b'] as any }, user: { id: 'uid' } } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ── NotificationController ────────────────────────────────────
    describe('NotificationController', () => {
        const ctrl = new NotificationController();

        it('createNotification returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.createNotification({ user: null, body: {} } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('getMyNotifications returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.getMyNotifications({ user: null } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('markAsRead returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.markAsRead({ user: null, params: { id: 'nid' } } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('clearNotification returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.clearNotification({ user: null, params: { id: 'nid' } } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    // ── AdminOrderController ──────────────────────────────────────
    describe('AdminOrderController', () => {
        const ctrl = new AdminOrderController();

        it('getAllOrders returns 500 on service error', async () => {
            jest.spyOn(require('../../services/order.service').OrderService.prototype, 'getAllOrders')
                .mockRejectedValue(new Error('DB error'));
            const res = mockRes();
            await ctrl.getAllOrders({ query: {} } as any, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── AdminDeliveryController ───────────────────────────────────
    describe('AdminDeliveryController', () => {
        const ctrl = new AdminDeliveryController();

        it('createDelivery returns 400 if missing required fields', async () => {
            const res = mockRes();
            await ctrl.createDelivery({
                user: { id: 'aid', username: 'admin', role: 'admin', email: 'a@a.com' },
                body: { orderId: 'oid' }, // missing recipientName etc.
            } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('createDelivery returns 400 if address incomplete', async () => {
            const res = mockRes();
            await ctrl.createDelivery({
                user: { id: 'aid', username: 'admin', role: 'admin', email: 'a@a.com' },
                body: {
                    orderId: 'oid', recipientName: 'R', recipientPhone: '123',
                    address: { street: 'S' }, // missing city and country
                },
            } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('updateDelivery returns 401 if no user', async () => {
            const res = mockRes();
            await ctrl.updateDelivery({ user: null, params: { id: 'did' }, body: {} } as any, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    // ── AdminUserController ───────────────────────────────────────
    describe('AdminUserController', () => {
        const ctrl = new AdminUserController();

        it('createUser returns 400 on validation failure', async () => {
            const res = mockRes();
            await ctrl.createUser({
                user: { id: 'aid', role: 'admin', username: 'admin', email: 'a@a.com' },
                body: { email: '' }, // invalid
            } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('updateUser returns 400 on validation failure', async () => {
            const res = mockRes();
            await ctrl.updateUser({
                params: { id: 'uid' },
                body: { username: 'x' }, // too short
            } as any, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});