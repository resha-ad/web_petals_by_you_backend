// src/controllers/admin/admin.order.controller.ts
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authorized.middleware";
import { OrderService } from "../../services/order.service";
import { HttpError } from "../../errors/http-error";
import { OrderStatus } from "../../models/order.model";

const getIdFromParams = (params: Request["params"]): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0];
    if (!id) throw new HttpError(400, "ID is required");
    return id;
};

const orderService = new OrderService();

export class AdminOrderController {
    // GET /api/admin/orders
    async getAllOrders(req: AuthenticatedRequest, res: Response) {
        try {
            const result = await orderService.getAllOrders(req.query);
            return res.status(200).json({
                success: true,
                data: result.orders,
                pagination: result.pagination,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Failed to fetch orders",
            });
        }
    }

    // GET /api/admin/orders/:id
    async getOrderById(req: AuthenticatedRequest, res: Response) {
        try {
            const order = await orderService.getOrderById(getIdFromParams(req.params));
            return res.status(200).json({ success: true, data: order });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Order not found",
            });
        }
    }

    // PATCH /api/admin/orders/:id/status
    async updateOrderStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const { status } = req.body;
            if (!status) throw new HttpError(400, "status is required");

            const adminUsername = req.user?.username || req.user?.email || "admin";
            const order = await orderService.updateOrderStatus(
                getIdFromParams(req.params),
                status as OrderStatus,
                adminUsername
            );
            return res.status(200).json({ success: true, data: order });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Failed to update order status",
            });
        }
    }

    // PATCH /api/admin/orders/:id/cancel
    async cancelOrder(req: AuthenticatedRequest, res: Response) {
        try {
            const { reason } = req.body;
            if (!reason?.trim()) throw new HttpError(400, "reason is required");

            const adminUsername = req.user?.username || req.user?.email || "admin";
            const order = await orderService.adminCancelOrder(
                getIdFromParams(req.params),
                reason.trim(),
                adminUsername
            );
            return res.status(200).json({
                success: true,
                message: "Order cancelled successfully",
                data: order,
            });
        } catch (err: any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Failed to cancel order",
            });
        }
    }
}