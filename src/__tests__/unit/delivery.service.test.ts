// src/__tests__/unit/delivery.service.test.ts
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryRepository } from '../../repositories/delivery.repository';
import { OrderRepository } from '../../repositories/order.repository';

describe('DeliveryService Unit Tests', () => {
    let service: DeliveryService;
    afterEach(() => jest.restoreAllMocks());

    beforeEach(() => { service = new DeliveryService(); });

    // ── createDelivery ────────────────────────────────────────────
    describe('createDelivery', () => {
        it('throws 404 if order not found', async () => {
            jest.spyOn(OrderRepository.prototype, 'findByIdRaw').mockResolvedValue(null);
            await expect(service.createDelivery({
                orderId: 'oid', recipientName: 'R', recipientPhone: '123',
                address: { street: 'S', city: 'C', country: 'N' },
            })).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 if order is cancelled', async () => {
            jest.spyOn(OrderRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'cancelled' } as any);
            await expect(service.createDelivery({
                orderId: 'oid', recipientName: 'R', recipientPhone: '123',
                address: { street: 'S', city: 'C', country: 'N' },
            })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 409 if delivery already exists', async () => {
            jest.spyOn(OrderRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'pending', userId: 'uid' } as any);
            jest.spyOn(DeliveryRepository.prototype, 'findByOrderIdRaw')
                .mockResolvedValue({ _id: 'did' } as any);
            await expect(service.createDelivery({
                orderId: 'oid', recipientName: 'R', recipientPhone: '123',
                address: { street: 'S', city: 'C', country: 'N' },
            })).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    // ── updateDelivery ────────────────────────────────────────────
    describe('updateDelivery', () => {
        it('throws 404 if delivery not found', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw').mockResolvedValue(null);
            await expect(service.updateDelivery('did', { status: 'assigned' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 if delivery is cancelled', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'cancelled' } as any);
            await expect(service.updateDelivery('did', { status: 'assigned' }))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 500 if update returns null', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'pending', orderId: { toString: () => 'oid' } } as any);
            jest.spyOn(DeliveryRepository.prototype, 'update').mockResolvedValue(null);
            await expect(service.updateDelivery('did', {}))
                .rejects.toMatchObject({ statusCode: 500 });
        });
    });

    // ── addTrackingUpdate ─────────────────────────────────────────
    describe('addTrackingUpdate', () => {
        it('throws 404 if delivery not found', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw').mockResolvedValue(null);
            await expect(service.addTrackingUpdate('did', 'msg', 'admin'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 if delivery is cancelled', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'cancelled' } as any);
            await expect(service.addTrackingUpdate('did', 'msg', 'admin'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 500 if pushTrackingUpdate returns null', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'pending' } as any);
            jest.spyOn(DeliveryRepository.prototype, 'pushTrackingUpdate').mockResolvedValue(null);
            await expect(service.addTrackingUpdate('did', 'msg', 'admin'))
                .rejects.toMatchObject({ statusCode: 500 });
        });
    });

    // ── cancelDelivery ────────────────────────────────────────────
    describe('cancelDelivery', () => {
        it('throws 404 if delivery not found', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw').mockResolvedValue(null);
            await expect(service.cancelDelivery('did', 'reason', 'admin'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 if already cancelled', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'cancelled' } as any);
            await expect(service.cancelDelivery('did', 'reason', 'admin'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 if already delivered', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'delivered' } as any);
            await expect(service.cancelDelivery('did', 'reason', 'admin'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 500 if update returns null', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByIdRaw')
                .mockResolvedValue({ status: 'pending' } as any);
            jest.spyOn(DeliveryRepository.prototype, 'update').mockResolvedValue(null);
            await expect(service.cancelDelivery('did', 'reason', 'admin'))
                .rejects.toMatchObject({ statusCode: 500 });
        });
    });

    // ── getDeliveryByOrderId ──────────────────────────────────────
    describe('getDeliveryByOrderId', () => {
        it('throws 403 if delivery belongs to another user', async () => {
            jest.spyOn(DeliveryRepository.prototype, 'findByOrderIdRaw')
                .mockResolvedValue({ userId: { toString: () => 'other-uid' } } as any);
            await expect(service.getDeliveryByOrderId('oid', 'my-uid', false))
                .rejects.toMatchObject({ statusCode: 403 });
        });
    });
});