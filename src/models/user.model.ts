import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role: "user" | "admin";
  imageUrl?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    imageUrl: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);