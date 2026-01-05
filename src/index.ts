import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import { connectToDB } from "./database/mongodb";
import { PORT } from "./config";
import authRoutes from "./routes/auth.route";

const app: Application = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, message: "API is running!" });
});

const startApp = async () => {
  await connectToDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startApp();
