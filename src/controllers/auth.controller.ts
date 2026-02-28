// src/controllers/auth.controller.ts  (PATCHED — replace updateProfile method only)
// Changes: username is now updatable by users with a uniqueness check

import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";
import { UserType } from "../types/user.type";
import bcryptjs from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";

const userService = new UserService();
const userRepo = new UserRepository();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validationResult = CreateUserDTO.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.flatten(),
          message:
            Object.values(validationResult.error.flatten().fieldErrors).flat()[0] ||
            "Validation failed",
        });
      }
      const createdUser = await userService.registerUser(validationResult.data);
      return res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: createdUser,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong on the server",
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validationResult = LoginUserDTO.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.flatten(),
        });
      }
      const { token, user } = await userService.authenticateUser(validationResult.data);
      return res
        .status(200)
        .json({ success: true, message: "Logged in successfully", data: user, token });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Server error during login",
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) throw new HttpError(401, "Authentication required");

      const updateData: Partial<UserType & { username?: string }> = {};
      if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
      if (req.body.phone !== undefined) {
        updateData.phone = req.body.phone?.trim() || null;
      }
      if (req.body.password) {
        updateData.password = await bcryptjs.hash(req.body.password, 12);
      }
      if (req.file) {
        updateData.imageUrl = `/uploads/${req.file.filename}`;
      }

      // ── USERNAME: allow update with uniqueness check ───────────────────
      if (req.body.username !== undefined && req.body.username.trim() !== "") {
        const newUsername = req.body.username.trim();
        if (newUsername.length < 3) {
          return res.status(400).json({
            success: false,
            message: "Username must be at least 3 characters",
          });
        }
        const existing = await userRepo.findByUsername(newUsername);
        if (existing && existing._id.toString() !== req.user.id) {
          return res.status(409).json({
            success: false,
            message: "Username is already taken",
          });
        }
        updateData.username = newUsername;
      }

      const updated = await userService.updateUser(req.user.id, updateData);
      res.status(200).json({ success: true, message: "Profile updated", data: updated });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Update failed",
      });
    }
  }

  async whoAmI(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      const fullUser = await userService.getUserById(req.user.id);
      return res.status(200).json({
        success: true,
        data: fullUser,
        message: "User profile fetched successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
}