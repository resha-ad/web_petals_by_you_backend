import { CustomBouquetRepository } from "../repositories/customBouquet.repository";
import { HttpError } from "../errors/http-error";
import { ICustomBouquet } from "../models/customBouquet.model";

const repo = new CustomBouquetRepository();

export class CustomBouquetService {
    async create(userId: string, payload: any): Promise<ICustomBouquet> {
        if (!payload.flowers?.length || !payload.wrapping || !payload.totalPrice) {
            throw new HttpError(400, "Invalid bouquet data");
        }
        return await repo.create({
            ...payload,
            userId,
        });
    }
}