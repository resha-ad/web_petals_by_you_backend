import bcryptjs from "bcryptjs";
import { HttpError } from "../../errors/http-error";
import { UserRepository } from "../../repositories/user.repository";
import { CreateUserDTO, UpdateUserDTO } from "../../dtos/user.dto";
import { IUser } from "../../models/user.model";
import { UserType } from "../../types/user.type";

const repo = new UserRepository();

export class AdminUserService {
    async createUser(data: CreateUserDTO & { imageUrl?: string | null | undefined }): Promise<IUser> {
        const emailExists = await repo.findByEmail(data.email);
        if (emailExists) throw new HttpError(409, "Email already in use");

        const usernameExists = await repo.findByUsername(data.username);
        if (usernameExists) throw new HttpError(409, "Username already taken");

        const hashed = await bcryptjs.hash(data.password, 12);

        const userData: Partial<UserType> = {
            ...data,
            password: hashed,
            imageUrl: data.imageUrl ?? null,
        };

        const user = await repo.create(userData);

        return user;
    }

    async getAllUsers(): Promise<IUser[]> {
        return await repo.findAll();
    }

    async getUserById(id: string): Promise<IUser> {
        const user = await repo.findById(id);
        if (!user) throw new HttpError(404, "User not found");
        return user;
    }

    async updateUser(id: string, data: Partial<UserType>): Promise<IUser> {
        const user = await repo.findById(id);
        if (!user) throw new HttpError(404, "User not found");

        if (data.email && data.email !== user.email) {
            if (await repo.findByEmail(data.email)) throw new HttpError(409, "Email in use");
        }
        if (data.username && data.username !== user.username) {
            if (await repo.findByUsername(data.username)) throw new HttpError(409, "Username taken");
        }

        // Now data is Partial<UserType>, which matches UpdateUserDTO perfectly
        return (await repo.update(id, data))!;
    }

    async deleteUser(id: string): Promise<void> {
        const deleted = await repo.remove(id);
        if (!deleted) throw new HttpError(404, "User not found");
    }
}