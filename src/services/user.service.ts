import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendResetPasswordEmail } from '../config/email';
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { UserRepository } from "../repositories/user.repository";
import { HttpError } from "../errors/http-error";
import { JWT_SECRET } from "../config";
import crypto from 'crypto';
import { UserType } from "../types/user.type";
import { IUser, UserModel } from "../models/user.model";

const userRepo = new UserRepository();

export class UserService {
  static resetPassword(token: any, newPassword: any) {
    throw new Error("Method not implemented.");
  }
  static forgotPassword(email: any) {
    throw new Error("Method not implemented.");
  }
  async registerUser(input: CreateUserDTO) {
    // Check for existing email
    const existingEmail = await userRepo.findByEmail(input.email);
    if (existingEmail) {
      throw new HttpError(409, "This email is already registered");
    }

    // Check for existing username
    const existingUsername = await userRepo.findByUsername(input.username);
    if (existingUsername) {
      throw new HttpError(409, "This username is already taken");
    }

    // Hash the password
    const hashedPwd = await bcryptjs.hash(input.password, 12);

    // Prepare user object (exclude confirmPassword)
    const userToSave = {
      email: input.email,
      username: input.username,
      password: hashedPwd,
      firstName: input.firstName,
      lastName: input.lastName,
    };

    return await userRepo.create(userToSave);
  }

  async authenticateUser(credentials: LoginUserDTO) {
    const user = await userRepo.findByEmail(credentials.email);
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcryptjs.compare(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const tokenPayload = {
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return { token, user };
  }

  async updateUser(userId: string, data: Partial<UserType>): Promise<IUser> {
    const user = await userRepo.findById(userId);
    if (!user) throw new HttpError(404, "User not found");

    // Prevent changing to existing email/username (if provided)
    if (data.email && data.email !== user.email) {
      const emailExists = await userRepo.findByEmail(data.email);
      if (emailExists) throw new HttpError(409, "Email already in use");
    }

    if (data.username && data.username !== user.username) {
      const usernameExists = await userRepo.findByUsername(data.username);
      if (usernameExists) throw new HttpError(409, "Username already taken");
    }

    // Password already hashed if provided

    const updatedUser = await userRepo.update(userId, data);
    if (!updatedUser) throw new HttpError(500, "Update failed");

    return updatedUser;
  }

  async forgotPassword(email: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      // Security: don't reveal if email exists
      return { message: "If the email exists, a reset link has been sent." };
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await sendResetPasswordEmail(user.email, resetUrl);

    return { message: "If the email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new HttpError(400, "Invalid or expired reset token");
    }

    user.password = await bcryptjs.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return { message: "Password reset successful" };
  }
  async getUserById(id: string): Promise<IUser> {
    const user = await userRepo.findById(id);
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }

}
