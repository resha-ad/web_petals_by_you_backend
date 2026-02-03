import mongoose, { Schema, Document, Model } from "mongoose";

// 1. Define the raw document interface (matches DB shape)
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}

// 2. Schema definition (no Zod generic here)
const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    firstName: { type: String },
    lastName: { type: String },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    imageUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);