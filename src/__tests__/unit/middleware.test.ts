// src/__tests__/unit/middleware.test.ts
import { protect, adminOnly, optionalProtect } from '../../middlewares/authorized.middleware';
import { UserRepository } from '../../repositories/user.repository';
import jwt from 'jsonwebtoken';

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const makeReq = (overrides: any = {}) => ({
    headers: {},
    cookies: {},
    ...overrides,
});

const JWT_SECRET = process.env.JWT_SECRET || 'mero_secret';

describe('Middleware Unit Tests', () => {
    afterEach(() => jest.restoreAllMocks());

    const fakeUser = {
        _id: { toString: () => 'user-id' },
        email: 'u@x.com', username: 'user', firstName: 'U',
        lastName: 'S', role: 'user', imageUrl: null,
    } as any;

    // ── protect ──────────────────────────────────────────────────
    describe('protect', () => {
        it('returns 401 if no token in header or cookie', async () => {
            const req = makeReq();
            const res = mockRes();
            const next = jest.fn();
            await protect(req as any, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'No token provided' }));
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 401 if token is invalid', async () => {
            const req = makeReq({ headers: { authorization: 'Bearer badtoken' } });
            const res = mockRes();
            const next = jest.fn();
            await protect(req as any, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token' }));
        });

        it('returns 401 if user not found in DB', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const token = jwt.sign({ id: 'ghost-id', role: 'user' }, JWT_SECRET);
            const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
            const res = mockRes();
            const next = jest.fn();
            await protect(req as any, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
        });

        it('calls next and sets req.user on valid token', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(fakeUser);
            const token = jwt.sign({ id: 'user-id', role: 'user' }, JWT_SECRET);
            const req = makeReq({ headers: { authorization: `Bearer ${token}` } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await protect(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.user.id).toBe('user-id');
        });

        it('reads token from cookie if no Authorization header', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(fakeUser);
            const token = jwt.sign({ id: 'user-id', role: 'user' }, JWT_SECRET);
            const req = makeReq({ cookies: { auth_token: token } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await protect(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    // ── optionalProtect ───────────────────────────────────────────
    describe('optionalProtect', () => {
        it('calls next as guest if no token', async () => {
            const req = makeReq() as any;
            const res = mockRes();
            const next = jest.fn();
            await optionalProtect(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.user).toBeUndefined();
        });

        it('sets req.user if valid token provided', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(fakeUser);
            const token = jwt.sign({ id: 'user-id', role: 'user' }, JWT_SECRET);
            const req = makeReq({ headers: { authorization: `Bearer ${token}` } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await optionalProtect(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.user).toBeDefined();
        });

        it('continues as guest if token is invalid', async () => {
            const req = makeReq({ headers: { authorization: 'Bearer badtoken' } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await optionalProtect(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.user).toBeUndefined();
        });

        it('continues as guest if user not found in DB', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const token = jwt.sign({ id: 'ghost', role: 'user' }, JWT_SECRET);
            const req = makeReq({ headers: { authorization: `Bearer ${token}` } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await optionalProtect(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.user).toBeUndefined();
        });

        it('reads token from cookie', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(fakeUser);
            const token = jwt.sign({ id: 'user-id', role: 'user' }, JWT_SECRET);
            const req = makeReq({ cookies: { auth_token: token } }) as any;
            const res = mockRes();
            const next = jest.fn();
            await optionalProtect(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    // ── adminOnly ─────────────────────────────────────────────────
    describe('adminOnly', () => {
        it('returns 403 if no user', () => {
            const req = makeReq() as any;
            const res = mockRes();
            const next = jest.fn();
            adminOnly(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 403 if user is not admin', () => {
            const req = makeReq({ user: { role: 'user' } }) as any;
            const res = mockRes();
            const next = jest.fn();
            adminOnly(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('calls next if user is admin', () => {
            const req = makeReq({ user: { role: 'admin' } }) as any;
            const res = mockRes();
            const next = jest.fn();
            adminOnly(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});