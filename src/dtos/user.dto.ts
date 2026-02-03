import { z } from "zod";
import { UserSchema } from "../types/user.type";

export const CreateUserDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
})
  .extend({
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirmation do not match",
    path: ["confirmPassword"],
  });

export type CreateUserDTO = z.infer<typeof CreateUserDTO>;

export const LoginUserDTO = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

// Update DTO: partial of base schema (includes imageUrl, no password/confirmPassword)
export const UpdateUserDTO = UserSchema.partial().omit({
  password: true,
  // Do NOT omit confirmPassword — it doesn't exist in UserSchema
});
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

// Admin can set image via upload, so we extend CreateUserDTO with optional imageUrl
export const AdminCreateUserDTO = CreateUserDTO.extend({
  imageUrl: z.string().optional().nullable(),
});

export type AdminCreateUserDTO = z.infer<typeof AdminCreateUserDTO>;