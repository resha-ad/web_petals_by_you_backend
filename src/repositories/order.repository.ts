import { OrderModel, IOrder, OrderStatus } from "../models/order.model";

export interface OrderQueryParams {
    page: number;
    limit: number;
    status?: OrderStatus;
    userId?: string;
    search?: string; // search by _id prefix for admin
}

export class OrderRepository {
    async create(data: Partial<IOrder>): Promise<IOrder> {
        const order = new OrderModel(data);
        return await order.save();
    }

    // With user info populated — use for returning data to client
    async findById(id: string): Promise<IOrder | null> {
        return await OrderModel.findById(id).populate("userId", "username email firstName lastName");
    }

    // Without populate — use for ownership checks (userId stays as raw ObjectId)
    async findByIdRaw(id: string): Promise<IOrder | null> {
        return await OrderModel.findById(id);
    }

    // User: fetch only their own orders
    async findByUserId(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ orders: IOrder[]; total: number }> {
        const [orders, total] = await Promise.all([
            OrderModel.find({ userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            OrderModel.countDocuments({ userId }),
        ]);
        return { orders, total };
    }

    // Admin: fetch all orders with filters
    async findAll(params: OrderQueryParams): Promise<{ orders: IOrder[]; total: number }> {
        const { page, limit, status, userId, search } = params;
        const filter: any = {};

        if (status) filter.status = status;
        if (userId) filter.userId = userId;

        const [orders, total] = await Promise.all([
            OrderModel.find(filter)
                .populate("userId", "username email firstName lastName")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            OrderModel.countDocuments(filter),
        ]);
        return { orders, total };
    }

    async updateStatus(
        id: string,
        status: OrderStatus,
        extra?: Partial<IOrder>
    ): Promise<IOrder | null> {
        return await OrderModel.findByIdAndUpdate(
            id,
            { status, ...extra },
            { new: true }
        );
    }

    async update(id: string, data: Partial<IOrder>): Promise<IOrder | null> {
        return await OrderModel.findByIdAndUpdate(id, data, { new: true });
    }
}