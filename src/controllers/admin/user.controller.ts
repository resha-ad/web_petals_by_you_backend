import { Request, Response } from "express";
import { AdminUserService } from "../../services/admin/user.service";
import { CreateUserDTO, UpdateUserDTO, AdminCreateUserDTO } from "../../dtos/user.dto";
import { AuthenticatedRequest } from "../../middlewares/authorized.middleware";
import { HttpError } from "../../errors/http-error";

// Helper to safely extract string ID from params
const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) {
        return id[0]; // rare case, but safe
    }
    if (!id) {
        throw new HttpError(400, "User ID is required");
    }
    return id;
};

const service = new AdminUserService();

export class AdminUserController {
    async createUser(req: AuthenticatedRequest, res: Response) {
        try {
            // Use the extended DTO here
            const result = AdminCreateUserDTO.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    errors: result.error.flatten(),
                });
            }

            const data = result.data;  // now has imageUrl?: string | null

            if (req.file) {
                data.imageUrl = `/uploads/${req.file.filename}`;  // ← no error now
            }

            const user = await service.createUser(data);
            return res.status(201).json({
                success: true,
                message: "User created successfully",
                data: user,
            });
        } catch (err: any) {
            const status = err instanceof HttpError ? err.statusCode : 500;
            return res.status(status).json({
                success: false,
                message: err.message || "Failed to create user",
            });
        }
    }
    async getAllUsers(_req: Request, res: Response) {
        try {
            const users = await service.getAllUsers();
            return res.status(200).json({
                success: true,
                data: users,
            });
        } catch (err: any) {
            const status = err instanceof HttpError ? err.statusCode : 500;
            return res.status(status).json({
                success: false,
                message: err.message || "Failed to fetch users",
            });
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const id = getIdFromParams(req.params);
            const user = await service.getUserById(id);
            return res.status(200).json({
                success: true,
                data: user,
            });
        } catch (err: any) {
            const status = err instanceof HttpError ? err.statusCode : 404;
            return res.status(status).json({
                success: false,
                message: err.message || "User not found",
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const result = UpdateUserDTO.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    errors: result.error.flatten(),
                });
            }

            const data = { ...result.data }; // shallow copy

            if (req.file) {
                data.imageUrl = `/uploads/${req.file.filename}`;
            }

            const id = getIdFromParams(req.params);
            const updated = await service.updateUser(id, data);

            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: updated,
            });
        } catch (err: any) {
            const status = err instanceof HttpError ? err.statusCode : 500;
            return res.status(status).json({
                success: false,
                message: err.message || "Failed to update user",
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const id = getIdFromParams(req.params);
            await service.deleteUser(id);

            return res.status(200).json({
                success: true,
                message: "User deleted successfully",
            });
        } catch (err: any) {
            const status = err instanceof HttpError ? err.statusCode : 404;
            return res.status(status).json({
                success: false,
                message: err.message || "User not found",
            });
        }
    }
}