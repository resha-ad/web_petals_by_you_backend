import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authorized.middleware";
import { DeliveryService } from "../../services/delivery.service";
import { HttpError } from "../../errors/http-error";

const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "ID is required");
    return id;
};

const getOrderIdFromParams = (params: Request["params"]): string => {
    const id = params.orderId;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "Order ID is required");
    return id;
};

const deliveryService = new DeliveryService();

export class AdminDeliveryController {
    // POST /api/admin/deliveries
    async createDelivery(req: AuthenticatedRequest, res: Response) {
        try {
            const { orderId, recipientName, recipientPhone, address, scheduledDate, estimatedDelivery, deliveryNotes } = req.body;

            if (!orderId || !recipientName || !recipientPhone || !address) {
                throw new HttpError(400, "orderId, recipientName, recipientPhone, and address are required");
            }
            if (!address.street || !address.city || !address.country) {
                throw new HttpError(400, "Address must include street, city, and country");
            }

            const delivery = await deliveryService.createDelivery({
                orderId,
                recipientName,
                recipientPhone,
                address,
                scheduledDate,
                estimatedDelivery,
                deliveryNotes,
            });

            return res.status(201).json({
                success: true,
                message: "Delivery created successfully",
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // GET /api/admin/deliveries
    async getAllDeliveries(req: AuthenticatedRequest, res: Response) {
        try {
            const result = await deliveryService.getAllDeliveries(req.query);
            return res.status(200).json({
                success: true,
                data: result.deliveries,
                pagination: result.pagination,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // GET /api/admin/deliveries/:id
    async getDeliveryById(req: AuthenticatedRequest, res: Response) {
        try {
            const delivery = await deliveryService.getDeliveryById(getIdFromParams(req.params));
            return res.status(200).json({
                success: true,
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // GET /api/admin/deliveries/order/:orderId
    async getDeliveryByOrderId(req: AuthenticatedRequest, res: Response) {
        try {
            const delivery = await deliveryService.getDeliveryByOrderId(
                getOrderIdFromParams(req.params),
                undefined,
                true  // isAdmin
            );
            return res.status(200).json({
                success: true,
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // PATCH /api/admin/deliveries/:id
    async updateDelivery(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) throw new HttpError(401, "Authentication required");  // add this guard
            const adminUsername = req.user.username || req.user.email || "admin"; // add this
            const delivery = await deliveryService.updateDelivery(
                getIdFromParams(req.params),
                req.body,
                adminUsername  // add this third argument
            );
            return res.status(200).json({
                success: true,
                message: "Delivery updated successfully",
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // POST /api/admin/deliveries/:id/tracking
    async addTrackingUpdate(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) throw new HttpError(401, "Authentication required");

            const { message } = req.body;
            if (!message) throw new HttpError(400, "Tracking message is required");

            const delivery = await deliveryService.addTrackingUpdate(
                getIdFromParams(req.params),
                message,
                req.user.username
            );

            return res.status(200).json({
                success: true,
                message: "Tracking update added",
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // PATCH /api/admin/deliveries/:id/cancel
    async cancelDelivery(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) throw new HttpError(401, "Authentication required");

            const { reason } = req.body;
            if (!reason) throw new HttpError(400, "Cancellation reason is required");

            const delivery = await deliveryService.cancelDelivery(
                getIdFromParams(req.params),
                reason,
                req.user.username
            );

            return res.status(200).json({
                success: true,
                message: "Delivery cancelled successfully",
                data: delivery,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }
}