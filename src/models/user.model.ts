import mongoose, { Schema, Document, Model } from "mongoose";
import { UserType } from "../types/user.type";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);