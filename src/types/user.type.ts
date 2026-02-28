import { z } from "zod";

// Reusable phone validator (Nepal format + international)
export const phoneValidator = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || /^(\+?977)?[0-9]{9,10}$/.test(val.replace(/[\s\-]/g, "")),
    { message: "Invalid phone number (e.g. 98XXXXXXXX or +97798XXXXXXXX)" }
  );

export const UserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: phoneValidator,
  role: z.enum(["user", "admin"]).default("user"),
  imageUrl: z.string().optional().nullable(),
});

export type UserType = z.infer<typeof UserSchema>;