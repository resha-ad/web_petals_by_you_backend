import { DeliveryModel, IDelivery, DeliveryStatus, TrackingUpdate } from "../models/delivery.model";

export class DeliveryRepository {
    async create(data: Partial<IDelivery>): Promise<IDelivery> {
        const delivery = new DeliveryModel(data);
        return await delivery.save();
    }

    // With full populate — use for returning data to client
    async findById(id: string): Promise<IDelivery | null> {
        return await DeliveryModel.findById(id)
            .populate("orderId")
            .populate("userId", "username email firstName lastName");
    }

    // Without populate — use for ownership checks and internal logic
    async findByIdRaw(id: string): Promise<IDelivery | null> {
        return await DeliveryModel.findById(id);
    }

    // With populate — for returning data to client
    async findByOrderId(orderId: string): Promise<IDelivery | null> {
        return await DeliveryModel.findOne({ orderId })
            .populate("orderId")
            .populate("userId", "username email firstName lastName");
    }

    // Without populate — for ownership checks and duplicate detection
    async findByOrderIdRaw(orderId: string): Promise<IDelivery | null> {
        return await DeliveryModel.findOne({ orderId });
    }

    async findAll(
        page: number = 1,
        limit: number = 10,
        status?: DeliveryStatus
    ): Promise<{ deliveries: IDelivery[]; total: number }> {
        const filter: any = {};
        if (status) filter.status = status;

        const [deliveries, total] = await Promise.all([
            DeliveryModel.find(filter)
                .populate("orderId", "totalAmount status paymentMethod")
                .populate("userId", "username email firstName lastName")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            DeliveryModel.countDocuments(filter),
        ]);
        return { deliveries, total };
    }

    async update(id: string, data: Partial<IDelivery>): Promise<IDelivery | null> {
        return await DeliveryModel.findByIdAndUpdate(id, data, { new: true });
    }

    async pushTrackingUpdate(
        id: string,
        update: TrackingUpdate
    ): Promise<IDelivery | null> {
        return await DeliveryModel.findByIdAndUpdate(
            id,
            { $push: { trackingUpdates: update } },
            { new: true }
        );
    }
}