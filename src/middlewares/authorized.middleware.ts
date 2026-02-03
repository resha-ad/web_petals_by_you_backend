import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { UserRepository } from "../repositories/user.repository";
import { HttpError } from "../errors/http-error";

const userRepo = new UserRepository();

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
        firstName?: string;
        lastName?: string;
        role: "user" | "admin";
    };
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new HttpError(401, "No token provided");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const user = await userRepo.findById(decoded.id);
        if (!user) {
            throw new HttpError(401, "User not found");
        }

        req.user = {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        };

        next();
    } catch (err: any) {
        res.status(err.statusCode || 401).json({
            success: false,
            message: err.message || "Not authorized",
        });
    }
};

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }
    next();
};