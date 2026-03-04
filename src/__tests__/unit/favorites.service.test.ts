import { FavoritesService } from '../../services/favorites.service';
import { ItemModel } from '../../models/item.model';
import { CustomBouquetModel } from '../../models/customBouquet.model';

describe('FavoritesService Unit Tests', () => {
    let service: FavoritesService;

    beforeEach(() => { service = new FavoritesService(); });
    afterEach(() => jest.restoreAllMocks());

    it('throws 404 if custom bouquet not found', async () => {
        jest.spyOn(CustomBouquetModel, 'findById').mockResolvedValue(null);
        await expect(service.addItem('uid', 'custom', '507f191e810c19729de860ea'))
            .rejects.toMatchObject({ statusCode: 404, message: 'Custom bouquet not found' });
    });

    it('throws 403 if custom bouquet belongs to another user', async () => {
        jest.spyOn(CustomBouquetModel, 'findById').mockResolvedValue({
            userId: { toString: () => 'other-id' },
        } as any);
        await expect(service.addItem('my-uid', 'custom', '507f191e810c19729de860ea'))
            .rejects.toMatchObject({ statusCode: 403 });
    });
});