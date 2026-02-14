import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { protect } from "../middlewares/authorized.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";
import { HttpError } from "../errors/http-error";
import { UserService } from "../services/user.service";

const router = Router();
const authController = new AuthController();

// ──── Add this line ────
const userService = new UserService();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/whoami", protect, authController.whoAmI);

router.put(
    "/profile",
    protect,
    uploadSingleImage,
    authController.updateProfile
);

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) throw new HttpError(400, "Email is required");

        // Use the instance, not the class
        const result = await userService.forgotPassword(email);

        res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Failed to process request",
        });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) throw new HttpError(400, "Token and new password required");

        // Use the instance
        const result = await userService.resetPassword(token, newPassword);

        res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Password reset failed",
        });
    }
});

export default router;