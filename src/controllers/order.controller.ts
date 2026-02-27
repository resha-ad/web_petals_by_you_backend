// src/controllers/order.controller.ts
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { OrderService } from "../services/order.service";
import { DeliveryService } from "../services/delivery.service";
import { HttpError } from "../errors/http-error";

const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "ID is required");
    return id;
};

const orderService = new OrderService();
const deliveryService = new DeliveryService();

export class OrderController {
    // POST /api/orders
    async placeOrder(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const { paymentMethod, notes, deliveryDetails } = req.body;
            if (!paymentMethod) throw new HttpError(400, "Payment method is required");

            // deliveryDetails shape:
            // { recipientName, recipientPhone, email, address: { street, city, state, zip, country } }
            if (!deliveryDetails?.recipientName || !deliveryDetails?.recipientPhone || !deliveryDetails?.address?.street || !deliveryDetails?.address?.city) {
                throw new HttpError(400, "Delivery details (name, phone, street, city) are required");
            }

            const { order, delivery } = await orderService.placeOrderFromCart(
                req.user.id,
                paymentMethod,
                notes,
                deliveryDetails
            );

            return res.status(201).json({
                success: true,
                message: "Order placed successfully",
                data: { order, delivery },
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Failed to place order",
            });
        }
    }

    // GET /api/orders
    async getMyOrders(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await orderService.getMyOrders(req.user.id, page, limit);
            return res.status(200).json({
                success: true,
                data: result.orders,
                pagination: result.pagination,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // GET /api/orders/:id
    async getMyOrderById(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const id = getIdFromParams(req.params);
            const order = await orderService.getMyOrderById(req.user.id, id);

            let delivery = null;
            try {
                delivery = await deliveryService.getDeliveryByOrderId(id, req.user.id, false);
            } catch (_) {
                // No delivery yet — fine
            }

            return res.status(200).json({
                success: true,
                data: { order, delivery },
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    // PATCH /api/orders/:id/cancel
    async cancelMyOrder(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user?.id) throw new HttpError(401, "Authentication required");

            const { reason } = req.body;
            const order = await orderService.cancelMyOrder(
                req.user.id,
                getIdFromParams(req.params),
                reason || "Cancelled by customer"
            );

            return res.status(200).json({
                success: true,
                message: "Order cancelled successfully",
                data: order,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message,
            });
        }
    }
}