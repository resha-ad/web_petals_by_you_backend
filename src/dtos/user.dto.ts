import { z } from "zod";
import { UserSchema, phoneValidator } from "../types/user.type";

// ─── Public Registration ───────────────────────────────────────────────────
export const CreateUserDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
})
  .extend({
    phone: phoneValidator,
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirmation do not match",
    path: ["confirmPassword"],
  });

export type CreateUserDTO = z.infer<typeof CreateUserDTO>;

// ─── Login ────────────────────────────────────────────────────────────────
export const LoginUserDTO = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

// ─── User self-update (profile page) ─────────────────────────────────────
// Email and username are IMMUTABLE from the user's side
export const UpdateUserDTO = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: phoneValidator,
  imageUrl: z.string().optional().nullable(),
});

export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

// ─── Admin: Create user ───────────────────────────────────────────────────
// Extends registration with role + imageUrl
export const AdminCreateUserDTO = CreateUserDTO.extend({
  role: z.enum(["user", "admin"]).default("user"),
  imageUrl: z.string().optional().nullable(),
});

export type AdminCreateUserDTO = z.infer<typeof AdminCreateUserDTO>;

// ─── Admin: Update user ───────────────────────────────────────────────────
// Admin CAN change username (unique check enforced in service)
// Admin CANNOT change email (immutable unique identifier)
export const AdminUpdateUserDTO = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  phone: phoneValidator,
  role: z.enum(["user", "admin"]).optional(),
  imageUrl: z.string().optional().nullable(),
});

export type AdminUpdateUserDTO = z.infer<typeof AdminUpdateUserDTO>;