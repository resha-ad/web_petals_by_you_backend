import { CustomBouquetModel, ICustomBouquet } from "../models/customBouquet.model";

export class CustomBouquetRepository {
    async create(data: Partial<ICustomBouquet>): Promise<ICustomBouquet> {
        const bouquet = new CustomBouquetModel(data);
        return await bouquet.save();
    }

    async findById(id: string): Promise<ICustomBouquet | null> {
        return await CustomBouquetModel.findById(id);
    }

}