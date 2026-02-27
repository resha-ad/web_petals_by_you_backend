// src/services/delivery.service.ts
import mongoose from "mongoose";
import { DeliveryRepository } from "../repositories/delivery.repository";
import { OrderRepository } from "../repositories/order.repository";
import { IDelivery, DeliveryAddress } from "../models/delivery.model";
import { HttpError } from "../errors/http-error";

const deliveryRepo = new DeliveryRepository();
const orderRepo = new OrderRepository();

export class DeliveryService {
    // ─── Admin: Create delivery for an order ─────────────────────────────
    async createDelivery(data: {
        orderId: string;
        recipientName: string;
        recipientPhone: string;
        address: DeliveryAddress;
        scheduledDate?: string;
        estimatedDelivery?: string;
        deliveryNotes?: string;
    }): Promise<IDelivery> {
        const order = await orderRepo.findByIdRaw(data.orderId);
        if (!order) throw new HttpError(404, "Order not found");

        if (order.status === "cancelled") {
            throw new HttpError(400, "Cannot create delivery for a cancelled order");
        }

        const existing = await deliveryRepo.findByOrderIdRaw(data.orderId);
        if (existing) throw new HttpError(409, "Delivery already exists for this order");

        const delivery = await deliveryRepo.create({
            orderId: new mongoose.Types.ObjectId(data.orderId),
            userId: order.userId,
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            address: data.address,
            scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
            estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
            deliveryNotes: data.deliveryNotes,
            trackingUpdates: [{
                message: "Delivery record created",
                timestamp: new Date(),
                updatedBy: "admin",
            }],
        });

        return delivery;
    }

    // ─── Admin: Get all deliveries ────────────────────────────────────────
    async getAllDeliveries(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const status = query.status;

        const { deliveries, total } = await deliveryRepo.findAll(page, limit, status);
        return {
            deliveries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── Admin/User: Get delivery by order ID ─────────────────────────────
    async getDeliveryByOrderId(orderId: string, userId?: string, isAdmin = false): Promise<IDelivery> {
        if (!isAdmin) {
            const raw = await deliveryRepo.findByOrderIdRaw(orderId);
            if (!raw) throw new HttpError(404, "Delivery not found for this order");
            if (raw.userId.toString() !== userId) {
                throw new HttpError(403, "Access denied");
            }
        }

        const delivery = await deliveryRepo.findByOrderId(orderId);
        if (!delivery) throw new HttpError(404, "Delivery not found for this order");
        return delivery;
    }

    // ─── Admin: Get delivery by delivery ID ───────────────────────────────
    async getDeliveryById(deliveryId: string): Promise<IDelivery> {
        const delivery = await deliveryRepo.findById(deliveryId);
        if (!delivery) throw new HttpError(404, "Delivery not found");
        return delivery;
    }

    // ─── Admin: Update delivery details/status ────────────────────────────
    async updateDelivery(
        deliveryId: string,
        data: {
            status?: string;
            recipientName?: string;
            recipientPhone?: string;
            address?: DeliveryAddress;
            scheduledDate?: string;
            estimatedDelivery?: string;
            deliveryNotes?: string;
        },
        adminUsername: string = "admin"
    ): Promise<IDelivery> {
        const delivery = await deliveryRepo.findByIdRaw(deliveryId);
        if (!delivery) throw new HttpError(404, "Delivery not found");

        if (delivery.status === "cancelled") {
            throw new HttpError(400, "Cannot update a cancelled delivery");
        }

        const updateData: any = { ...data };
        if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
        if (data.estimatedDelivery) updateData.estimatedDelivery = new Date(data.estimatedDelivery);

        // When delivery is marked delivered:
        // - set deliveredAt
        // - sync order status to "delivered"
        // - push tracking update
        if (data.status === "delivered") {
            updateData.deliveredAt = new Date();
            await orderRepo.update(delivery.orderId.toString(), { status: "delivered" });
            await deliveryRepo.pushTrackingUpdate(deliveryId, {
                message: "Package delivered successfully",
                timestamp: new Date(),
                updatedBy: adminUsername,
            });
        }

        // When delivery is marked in_transit, sync order to out_for_delivery
        if (data.status === "in_transit") {
            await orderRepo.update(delivery.orderId.toString(), { status: "out_for_delivery" });
            await deliveryRepo.pushTrackingUpdate(deliveryId, {
                message: "Package is out for delivery",
                timestamp: new Date(),
                updatedBy: adminUsername,
            });
        }

        const updated = await deliveryRepo.update(deliveryId, updateData);
        if (!updated) throw new HttpError(500, "Update failed");
        return updated;
    }

    // ─── Admin: Push a tracking update ───────────────────────────────────
    async addTrackingUpdate(
        deliveryId: string,
        message: string,
        adminUsername: string
    ): Promise<IDelivery> {
        const delivery = await deliveryRepo.findByIdRaw(deliveryId);
        if (!delivery) throw new HttpError(404, "Delivery not found");

        if (delivery.status === "cancelled") {
            throw new HttpError(400, "Cannot add tracking to a cancelled delivery");
        }

        const updated = await deliveryRepo.pushTrackingUpdate(deliveryId, {
            message,
            timestamp: new Date(),
            updatedBy: adminUsername,
        });

        if (!updated) throw new HttpError(500, "Failed to add tracking update");
        return updated;
    }

    // ─── Admin: Cancel delivery ───────────────────────────────────────────
    async cancelDelivery(
        deliveryId: string,
        reason: string,
        adminUsername: string
    ): Promise<IDelivery> {
        const delivery = await deliveryRepo.findByIdRaw(deliveryId);
        if (!delivery) throw new HttpError(404, "Delivery not found");

        if (delivery.status === "cancelled") {
            throw new HttpError(400, "Delivery is already cancelled");
        }
        if (delivery.status === "delivered") {
            throw new HttpError(400, "Cannot cancel a completed delivery");
        }

        const updated = await deliveryRepo.update(deliveryId, {
            status: "cancelled",
            cancelledBy: "admin",
            cancelReason: reason,
            cancelledAt: new Date(),
        });

        if (!updated) throw new HttpError(500, "Cancellation failed");

        await deliveryRepo.pushTrackingUpdate(deliveryId, {
            message: `Delivery cancelled. Reason: ${reason}`,
            timestamp: new Date(),
            updatedBy: adminUsername,
        });

        return updated;
    }
}