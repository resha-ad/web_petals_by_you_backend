import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { protect } from "../middlewares/authorized.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/whoami", protect, authController.whoAmI);

//Update own profile (with optional image)
router.put(
    "/profile",
    protect,
    uploadSingleImage,
    authController.updateProfile
);

export default router;