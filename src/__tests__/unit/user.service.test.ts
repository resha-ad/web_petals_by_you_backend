import { UserService } from '../../services/user.service';
import { UserRepository } from '../../repositories/user.repository';

jest.mock('../../config/email', () => ({
    sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('UserService Unit Tests', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService();
    });

    afterEach(() => jest.restoreAllMocks());

    describe('updateUser', () => {
        it('throws 404 if user not found', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            await expect(service.updateUser('id', {}))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('throws 409 if new email already in use', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue({ _id: 'id1', email: 'old@x.com', username: 'u' } as any);
            jest.spyOn(UserRepository.prototype, 'findByEmail').mockResolvedValue({ _id: 'id2' } as any);
            await expect(service.updateUser('id1', { email: 'new@x.com' }))
                .rejects.toMatchObject({ statusCode: 409, message: 'Email already in use' });
        });

        it('throws 409 if new username already taken', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue({ _id: 'id1', email: 'x@x.com', username: 'old' } as any);
            jest.spyOn(UserRepository.prototype, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue({ _id: 'id2' } as any);
            await expect(service.updateUser('id1', { username: 'new' }))
                .rejects.toMatchObject({ statusCode: 409, message: 'Username already taken' });
        });

        it('throws 500 if update returns null', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue({ _id: 'id1', email: 'x@x.com', username: 'u' } as any);
            jest.spyOn(UserRepository.prototype, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue(null);
            jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(null);
            await expect(service.updateUser('id1', { firstName: 'T' }))
                .rejects.toMatchObject({ statusCode: 500 });
        });

        it('returns updated user successfully', async () => {
            const user = { _id: 'id1', email: 'x@x.com', username: 'u' } as any;
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            jest.spyOn(UserRepository.prototype, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue({ ...user, firstName: 'New' } as any);
            const result = await service.updateUser('id1', { firstName: 'New' });
            expect(result.firstName).toBe('New');
        });
    });

    describe('static stubs', () => {
        it('UserService.forgotPassword static stub throws', () => {
            expect(() => UserService.forgotPassword('x')).toThrow('Method not implemented');
        });

        it('UserService.resetPassword static stub throws', () => {
            expect(() => UserService.resetPassword('x', 'y')).toThrow('Method not implemented');
        });
    });
});