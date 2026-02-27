// src/services/order.service.ts
import mongoose from "mongoose";
import { OrderRepository } from "../repositories/order.repository";
import { CartRepository } from "../repositories/cart.repository";
import { IOrder, OrderStatus } from "../models/order.model";
import { HttpError } from "../errors/http-error";
import { DeliveryRepository } from "../repositories/delivery.repository";

const orderRepo = new OrderRepository();
const cartRepo = new CartRepository();
const deliveryRepo = new DeliveryRepository();

/**
 * Admin can manually advance orders through:
 *   pending → confirmed → preparing
 *
 * "out_for_delivery" and "delivered" are driven automatically
 * by the delivery service when delivery status changes:
 *   delivery "in_transit"  → order "out_for_delivery"
 *   delivery "delivered"   → order "delivered"
 *
 * Cancellation is always allowed (except already cancelled / delivered).
 */
const ADMIN_VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pending: ["confirmed"],
    confirmed: ["preparing"],
    preparing: [],              // Next step is creating/managing delivery
    out_for_delivery: [],       // Driven by delivery service
    delivered: [],
    cancelled: [],
};

interface DeliveryDetails {
    recipientName: string;
    recipientPhone: string;
    email?: string;
    address: {
        street: string;
        city: string;
        state?: string;
        zip?: string;
        country: string;
    };
}

export class OrderService {
    // ─── User: Place order from cart ─────────────────────────────────────
    async placeOrderFromCart(
        userId: string,
        paymentMethod: "cash_on_delivery" | "online",
        notes?: string,
        deliveryDetails?: DeliveryDetails
    ): Promise<{ order: IOrder; delivery: any }> {
        const cart = await cartRepo.findByUserId(userId);
        if (!cart || !cart.items || cart.items.length === 0) {
            throw new HttpError(400, "Your cart is empty");
        }

        const orderItems = cart.items.map((item: any) => {
            const details = item.refDetails;
            const refId = item.refId?._id ?? item.refId;

            const name =
                details?.name ||
                (details?.recipientName
                    ? `Custom Bouquet for ${details.recipientName}`
                    : "Custom Bouquet");

            const imageUrl = details?.images?.[0] || null;

            return {
                type: item.type,
                refId: new mongoose.Types.ObjectId(refId.toString()),
                name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                subtotal: item.subtotal,
                imageUrl,
            };
        });

        const order = await orderRepo.create({
            userId: new mongoose.Types.ObjectId(userId),
            items: orderItems,
            totalAmount: cart.total,
            paymentMethod,
            paymentStatus: paymentMethod === "online" ? "paid" : "unpaid",
            notes,
        });

        // Auto-create delivery record with the details provided by the user
        let delivery = null;
        if (deliveryDetails) {
            delivery = await deliveryRepo.create({
                orderId: order._id,
                userId: new mongoose.Types.ObjectId(userId),
                recipientName: deliveryDetails.recipientName,
                recipientPhone: deliveryDetails.recipientPhone,
                address: {
                    street: deliveryDetails.address.street,
                    city: deliveryDetails.address.city,
                    state: deliveryDetails.address.state,
                    zip: deliveryDetails.address.zip,
                    country: deliveryDetails.address.country || "Nepal",
                },
                status: "pending",
                trackingUpdates: [{
                    message: "Order placed — awaiting confirmation",
                    timestamp: new Date(),
                    updatedBy: "system",
                }],
            });
        }

        // Clear cart after placing order
        await cartRepo.clearCart(userId);

        return { order, delivery };
    }

    // ─── User: Get my orders (paginated) ────────────────────────────────
    async getMyOrders(userId: string, page: number, limit: number) {
        const { orders, total } = await orderRepo.findByUserId(userId, page, limit);
        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── User: Get single order (must own it) ────────────────────────────
    async getMyOrderById(userId: string, orderId: string): Promise<IOrder> {
        const raw = await orderRepo.findByIdRaw(orderId);
        if (!raw) throw new HttpError(404, "Order not found");
        if (raw.userId.toString() !== userId) {
            throw new HttpError(403, "Access denied");
        }
        return (await orderRepo.findById(orderId)) as IOrder;
    }

    // ─── User: Cancel order (only if pending) ────────────────────────────
    async cancelMyOrder(userId: string, orderId: string, reason: string): Promise<IOrder> {
        const order = await orderRepo.findByIdRaw(orderId);
        if (!order) throw new HttpError(404, "Order not found");
        if (order.userId.toString() !== userId) {
            throw new HttpError(403, "Access denied");
        }
        if (order.status !== "pending") {
            throw new HttpError(
                400,
                `Order cannot be cancelled — it is already "${order.status}". Only pending orders can be cancelled.`
            );
        }

        return await orderRepo.update(orderId, {
            status: "cancelled",
            cancelledBy: "user",
            cancelReason: reason || "Cancelled by customer",
            cancelledAt: new Date(),
        }) as IOrder;
    }

    // ─── Admin: Get all orders ────────────────────────────────────────────
    async getAllOrders(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const status = query.status as OrderStatus | undefined;
        const userId = query.userId as string | undefined;

        const { orders, total } = await orderRepo.findAll({ page, limit, status, userId });
        return {
            orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    // ─── Admin: Get single order ──────────────────────────────────────────
    async getOrderById(orderId: string): Promise<IOrder> {
        const order = await orderRepo.findById(orderId);
        if (!order) throw new HttpError(404, "Order not found");
        return order;
    }

    // ─── Admin: Update order status ───────────────────────────────────────
    async updateOrderStatus(orderId: string, newStatus: OrderStatus, adminUsername: string): Promise<IOrder> {
        const order = await orderRepo.findByIdRaw(orderId);
        if (!order) throw new HttpError(404, "Order not found");

        const allowed = ADMIN_VALID_TRANSITIONS[order.status];
        if (!allowed.includes(newStatus)) {
            throw new HttpError(
                400,
                `Cannot transition from "${order.status}" to "${newStatus}". ` +
                (allowed.length
                    ? `Allowed: [${allowed.join(", ")}]`
                    : `"${order.status}" orders cannot be manually advanced — use the delivery panel.`)
            );
        }

        return await orderRepo.update(orderId, { status: newStatus }) as IOrder;
    }

    // ─── Admin: Cancel order ──────────────────────────────────────────────
    async adminCancelOrder(orderId: string, reason: string, adminUsername: string): Promise<IOrder> {
        const order = await orderRepo.findByIdRaw(orderId);
        if (!order) throw new HttpError(404, "Order not found");

        if (order.status === "cancelled") throw new HttpError(400, "Order is already cancelled");
        if (order.status === "delivered") throw new HttpError(400, "Cannot cancel a delivered order");

        // Also cancel linked delivery if it exists and isn't terminal
        const delivery = await deliveryRepo.findByOrderIdRaw(orderId);
        if (delivery && delivery.status !== "cancelled" && delivery.status !== "delivered") {
            await deliveryRepo.update(delivery._id.toString(), {
                status: "cancelled",
                cancelledBy: "admin",
                cancelReason: `Order cancelled by admin: ${reason}`,
                cancelledAt: new Date(),
            });
        }

        return await orderRepo.update(orderId, {
            status: "cancelled",
            cancelledBy: "admin",
            cancelReason: reason,
            cancelledAt: new Date(),
        }) as IOrder;
    }
}