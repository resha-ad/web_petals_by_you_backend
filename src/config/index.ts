import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/myappdb";
export const JWT_SECRET = process.env.JWT_SECRET || "my-super-secret-jwt-key-change-in-production";
