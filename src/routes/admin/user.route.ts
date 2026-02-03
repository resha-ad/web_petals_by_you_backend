import { Router } from "express";
import { AdminUserController } from "../../controllers/admin/user.controller";
import { protect, adminOnly } from "../../middlewares/authorized.middleware";
import { uploadSingleImage } from "../../middlewares/upload.middleware";

const router = Router();
const controller = new AdminUserController();

router.use(protect, adminOnly); // all routes below require login + admin

router.post("/", uploadSingleImage, controller.createUser);
router.get("/", controller.getAllUsers);
router.get("/:id", controller.getUserById);
router.put("/:id", uploadSingleImage, controller.updateUser);
router.delete("/:id", controller.deleteUser);

export default router;