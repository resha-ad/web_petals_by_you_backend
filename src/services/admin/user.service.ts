import bcryptjs from "bcryptjs";
import { HttpError } from "../../errors/http-error";
import { UserRepository } from "../../repositories/user.repository";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../../dtos/user.dto";
import { IUser } from "../../models/user.model";

const repo = new UserRepository();

export class AdminUserService {
    async createUser(
        data: AdminCreateUserDTO & { imageUrl?: string | null }
    ): Promise<IUser> {
        const emailExists = await repo.findByEmail(data.email);
        if (emailExists) throw new HttpError(409, "Email already in use");

        const usernameExists = await repo.findByUsername(data.username);
        if (usernameExists) throw new HttpError(409, "Username already taken");

        const hashed = await bcryptjs.hash(data.password, 12);

        return await repo.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            username: data.username,
            password: hashed,
            phone: data.phone ?? null,
            role: data.role ?? "user",
            imageUrl: data.imageUrl ?? null,
        });
    }

    async getAllUsers(page = 1, limit = 10, search?: string) {
        const { users, total } = await repo.findAllPaginated(page, limit, search);
        return {
            users,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getUserById(id: string): Promise<IUser> {
        const user = await repo.findById(id);
        if (!user) throw new HttpError(404, "User not found");
        return user;
    }

    async updateUser(
        id: string,
        data: AdminUpdateUserDTO & { imageUrl?: string | null }
    ): Promise<IUser> {
        const user = await repo.findById(id);
        if (!user) throw new HttpError(404, "User not found");

        // Email is permanently immutable
        if ((data as any).email) {
            throw new HttpError(400, "Email cannot be changed");
        }

        // Username uniqueness check (only if changed)
        if (data.username && data.username !== user.username) {
            const taken = await repo.findByUsername(data.username);
            if (taken) throw new HttpError(409, "Username already taken");
        }

        return (await repo.update(id, data as any))!;
    }

    async deleteUser(id: string): Promise<void> {
        const deleted = await repo.remove(id);
        if (!deleted) throw new HttpError(404, "User not found");
    }
}