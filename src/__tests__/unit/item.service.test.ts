import { ItemService } from '../../services/item.service';
import { ItemRepository } from '../../repositories/item.repository';

describe('ItemService Unit Tests', () => {
    let service: ItemService;

    beforeEach(() => { service = new ItemService(); });
    afterEach(() => jest.restoreAllMocks());

    const mockReq = (body = {}, files?: any) => ({
        body, files, user: { id: 'admin-id' },
    }) as any;

    describe('createItem', () => {
        it('throws 401 if no user', async () => {
            const req = { body: {}, user: null } as any;
            await expect(service.createItem(req)).rejects.toMatchObject({ statusCode: 401 });
        });
    });

    describe('updateItem', () => {
        it('throws 400 if validation fails (negative price)', async () => {
            const req = mockReq({ price: -1 });
            await expect(service.updateItem(req, 'id')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 404 if item not found', async () => {
            jest.spyOn(ItemRepository.prototype, 'findByIdentifier').mockResolvedValue(null);
            const req = mockReq({ name: 'T', description: 'D', price: 100, stock: 5 });
            await expect(service.updateItem(req, 'nonexistent')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 400 if more than 5 images', async () => {
            jest.spyOn(ItemRepository.prototype, 'findByIdentifier').mockResolvedValue({ images: [] } as any);
            const req = mockReq(
                {
                    name: 'T', description: 'D', price: 100, stock: 1,
                    existingImages: JSON.stringify(['/1', '/2', '/3', '/4', '/5']),
                },
                [{ filename: 'new.jpg' }]
            );
            await expect(service.updateItem(req, 'id'))
                .rejects.toMatchObject({ statusCode: 400, message: 'Maximum 5 images allowed' });
        });

        it('handles invalid existingImages JSON gracefully', async () => {
            jest.spyOn(ItemRepository.prototype, 'findByIdentifier').mockResolvedValue({ images: ['/old.jpg'] } as any);
            jest.spyOn(ItemRepository.prototype, 'update').mockResolvedValue({ name: 'Updated' } as any);
            const req = mockReq({ name: 'T', description: 'D', price: 100, stock: 1, existingImages: 'bad-json' });
            const result = await service.updateItem(req, 'id');
            expect(result).toBeDefined();
        });

        it('handles invalid removedImages JSON gracefully', async () => {
            jest.spyOn(ItemRepository.prototype, 'findByIdentifier').mockResolvedValue({ images: ['/old.jpg'] } as any);
            jest.spyOn(ItemRepository.prototype, 'update').mockResolvedValue({ name: 'Updated' } as any);
            const req = mockReq({ name: 'T', description: 'D', price: 100, stock: 1, removedImages: 'bad-json' });
            const result = await service.updateItem(req, 'id');
            expect(result).toBeDefined();
        });

        it('throws 404 if update returns null', async () => {
            jest.spyOn(ItemRepository.prototype, 'findByIdentifier').mockResolvedValue({ images: [] } as any);
            jest.spyOn(ItemRepository.prototype, 'update').mockResolvedValue(null);
            const req = mockReq({ name: 'T', description: 'D', price: 100, stock: 1 });
            await expect(service.updateItem(req, 'id')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});