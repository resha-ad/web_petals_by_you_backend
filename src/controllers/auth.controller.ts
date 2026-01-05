import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import z from "zod";

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
}
