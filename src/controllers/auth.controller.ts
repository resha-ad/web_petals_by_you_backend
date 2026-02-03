import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import z from "zod";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { HttpError } from "../errors/http-error";
import { UserType } from "../types/user.type";
import bcryptjs from "bcryptjs";

const userService = new UserService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validationResult = CreateUserDTO.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.flatten(),
        });
      }

      const userPayload = validationResult.data;
      const createdUser = await userService.registerUser(userPayload);

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

      const credentials = validationResult.data;
      const { token, user } = await userService.authenticateUser(credentials);

      return res.status(200).json({
        success: true,
        message: "Logged in successfully",
        data: user,
        token,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Server error during login",
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        throw new HttpError(401, "Authentication required");
      }

      const updateData: Partial<UserType> = {};

      // Copy allowed fields from body
      if (req.body.firstName) updateData.firstName = req.body.firstName;
      if (req.body.lastName) updateData.lastName = req.body.lastName;
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.email) updateData.email = req.body.email;

      // Optional password change
      if (req.body.password) {
        updateData.password = await bcryptjs.hash(req.body.password, 12);
      }

      // Handle image
      if (req.file) {
        updateData.imageUrl = `/uploads/${req.file.filename}`;
      }

      const updated = await userService.updateUser(req.user.id, updateData);

      res.status(200).json({
        success: true,
        message: "Profile updated",
        data: updated,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Update failed",
      });
    }
  }

  // Add this method to AuthController class
  async whoAmI(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      res.status(200).json({ success: true, data: req.user });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}