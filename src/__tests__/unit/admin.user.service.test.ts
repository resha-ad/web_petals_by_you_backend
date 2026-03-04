import { AdminUserService } from '../../services/admin/user.service';
import { UserRepository } from '../../repositories/user.repository';

describe('AdminUserService Unit Tests', () => {
    let service: AdminUserService;

    beforeEach(() => { service = new AdminUserService(); });
    afterEach(() => jest.restoreAllMocks());

    describe('updateUser', () => {
        it('throws 400 if email change attempted', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue({ _id: 'id1', username: 'u' } as any);
            await expect(service.updateUser('id1', { email: 'new@x.com' } as any))
                .rejects.toMatchObject({ statusCode: 400, message: 'Email cannot be changed' });
        });

        it('throws 409 if new username already taken', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue({ _id: 'id1', username: 'old' } as any);
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue({ _id: 'id2' } as any);
            await expect(service.updateUser('id1', { username: 'taken' }))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('updates successfully when username unchanged', async () => {
            const user = { _id: 'id1', username: 'same' } as any;
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue({ ...user, firstName: 'New' } as any);
            const result = await service.updateUser('id1', { username: 'same', firstName: 'New' });
            expect(result.firstName).toBe('New');
        });
    });
});