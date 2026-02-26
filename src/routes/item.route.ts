// src/routes/item.route.ts
import { Router } from 'express';
import { ItemController } from '../controllers/item.controller';
import { protect, adminOnly, optionalProtect } from '../middlewares/authorized.middleware';
import { uploadMultipleImages } from '../middlewares/upload.middleware';

const router = Router();
const controller = new ItemController();

router.get("/id/:id", controller.getById);
router.get('/', optionalProtect, controller.getAllItems.bind(controller)); // bind to preserve 'this' if class method      //optional auth
router.get('/:id', optionalProtect, controller.getSingleItem);

router.use(protect, adminOnly);  // only applies to POST/PUT/DELETE
router.post('/', uploadMultipleImages, controller.createItem);
router.put('/:id', uploadMultipleImages, controller.updateItem);
router.delete('/:id', controller.deleteItem);

export default router;