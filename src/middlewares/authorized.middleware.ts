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
        imageUrl?: string | null;
    };
}

// src/middlewares/authorized.middleware.ts
export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token = req.headers.authorization?.split(" ")[1];

    // Primary: header
    if (token) {
        console.log("[protect] Token from Authorization header");
    } else {
        // Fallback: cookie (now works with cookie-parser)
        token = req.cookies?.auth_token;
        if (token) {
            console.log("[protect] Token from cookie");
        }
    }

    if (!token) {
        console.log("[protect] No token found anywhere");
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log("[protect] Decoded:", decoded.id, decoded.role);

        const user = await userRepo.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.user = {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            imageUrl: user.imageUrl,
        };

        next();
    } catch (err: any) {
        console.error("[protect] JWT error:", err.message);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

// Optional auth – only sets req.user if token is present and valid, otherwise guest
export const optionalProtect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token = req.headers.authorization?.split(" ")[1];

    // Fallback to cookie
    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
        console.log("[optionalProtect] Token from cookie");
    }

    // No token? Guest mode - continue
    if (!token) {
        console.log("[optionalProtect] No token - guest mode");
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log("[optionalProtect] Decoded:", decoded.id, decoded.role);

        const user = await userRepo.findById(decoded.id);
        if (user) {
            req.user = {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                imageUrl: user.imageUrl,
            };
            console.log("[optionalProtect] User set:", req.user.role);
        } else {
            console.log("[optionalProtect] User not found");
        }
    } catch (err: any) {
        console.warn("[optionalProtect] Invalid token:", err.message);
        // Continue as guest
    }

    next();
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