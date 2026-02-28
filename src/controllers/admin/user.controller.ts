import { Request, Response } from "express";
import { AdminUserService } from "../../services/admin/user.service";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../../dtos/user.dto";
import { AuthenticatedRequest } from "../../middlewares/authorized.middleware";
import { HttpError } from "../../errors/http-error";

const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "User ID is required");
    return id;
};

const service = new AdminUserService();

export class AdminUserController {
    async createUser(req: AuthenticatedRequest, res: Response) {
        try {
            const result = AdminCreateUserDTO.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message:
                        Object.values(result.error.flatten().fieldErrors).flat()[0] ||
                        "Validation failed",
                    errors: result.error.flatten(),
                });
            }

            const data = result.data;
            if (req.file) {
                (data as any).imageUrl = `/uploads/${req.file.filename}`;
            }

            const user = await service.createUser(data);
            return res
                .status(201)
                .json({ success: true, message: "User created successfully", data: user });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false,
                message: err.message || "Failed to create user",
            });
        }
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const size = Number(req.query.size) || 10;
            const search = req.query.search as string | undefined;

            const result = await service.getAllUsers(page, size, search);
            return res.status(200).json({
                success: true,
                data: result.users,
                pagination: result.pagination,
                message: "Users retrieved",
            });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false,
                message: err.message || "Failed to retrieve users",
            });
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const user = await service.getUserById(getIdFromParams(req.params));
            return res.status(200).json({ success: true, data: user });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 404).json({
                success: false,
                message: err.message || "User not found",
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const result = AdminUpdateUserDTO.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message:
                        Object.values(result.error.flatten().fieldErrors).flat()[0] ||
                        "Validation failed",
                    errors: result.error.flatten(),
                });
            }

            const data: any = { ...result.data };
            if (req.file) {
                data.imageUrl = `/uploads/${req.file.filename}`;
            }

            const updated = await service.updateUser(getIdFromParams(req.params), data);
            return res
                .status(200)
                .json({ success: true, message: "User updated successfully", data: updated });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 500).json({
                success: false,
                message: err.message || "Failed to update user",
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            await service.deleteUser(getIdFromParams(req.params));
            return res.status(200).json({ success: true, message: "User deleted successfully" });
        } catch (err: any) {
            return res.status(err instanceof HttpError ? err.statusCode : 404).json({
                success: false,
                message: err.message || "User not found",
            });
        }
    }
}