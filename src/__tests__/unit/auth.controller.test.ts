import { AuthController } from '../../controllers/auth.controller';
import { UserService } from '../../services/user.service';
import { UserRepository } from '../../repositories/user.repository';

jest.mock('../../config/email', () => ({
    sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockReq = (body = {}, user?: any, file?: any) => ({ body, user, file }) as any;
const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('AuthController Unit Tests', () => {
    let controller: AuthController;

    beforeEach(() => { controller = new AuthController(); });
    afterEach(() => jest.restoreAllMocks());

    describe('updateProfile', () => {
        it('returns 401 if no user on request', async () => {
            const res = mockRes();
            await controller.updateProfile(mockReq({}, undefined), res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns 400 if username too short', async () => {
            const res = mockRes();
            await controller.updateProfile(mockReq({ username: 'ab' }, { id: 'uid' }), res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 409 if username taken by another user', async () => {
            jest.spyOn(UserRepository.prototype, 'findByUsername')
                .mockResolvedValue({ _id: { toString: () => 'other-id' } } as any);
            const res = mockRes();
            await controller.updateProfile(mockReq({ username: 'taken' }, { id: 'uid' }), res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('updates profile successfully', async () => {
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue(null);
            jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({ username: 'newname' } as any);
            const res = mockRes();
            await controller.updateProfile(mockReq({ username: 'newname' }, { id: 'uid' }), res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('sets imageUrl from req.file', async () => {
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue(null);
            const spy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({} as any);
            const res = mockRes();
            await controller.updateProfile(mockReq({ firstName: 'T' }, { id: 'uid' }, { filename: 'test.jpg' }), res);
            expect(spy).toHaveBeenCalledWith('uid', expect.objectContaining({ imageUrl: '/uploads/test.jpg' }));
        });

        it('sets phone to null when empty string', async () => {
            jest.spyOn(UserRepository.prototype, 'findByUsername').mockResolvedValue(null);
            const spy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({} as any);
            const res = mockRes();
            await controller.updateProfile(mockReq({ phone: '  ' }, { id: 'uid' }), res);
            expect(spy).toHaveBeenCalledWith('uid', expect.objectContaining({ phone: null }));
        });
    });

    describe('whoAmI', () => {
        it('returns 401 if no user', async () => {
            const res = mockRes();
            await controller.whoAmI(mockReq({}, undefined), res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns 200 with user data', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ email: 'x@x.com' } as any);
            const res = mockRes();
            await controller.whoAmI(mockReq({}, { id: 'uid' }), res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});