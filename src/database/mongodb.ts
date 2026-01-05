import mongoose from "mongoose";
import { MONGODB_URI } from "../config";

export const connectToDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
};
