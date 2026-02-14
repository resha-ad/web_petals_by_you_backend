import { UserModel, IUser } from "../models/user.model";
import { UserType } from "../types/user.type";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  create(userData: Partial<IUser>): Promise<IUser>;
  findById(id: string): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  update(id: string, data: Partial<IUser>): Promise<IUser | null>;
  remove(id: string): Promise<boolean>;
}

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return await UserModel.findOne({ email });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return await UserModel.findOne({ username });
  }

  async create(userData: Partial<UserType>): Promise<IUser> {
    const user = new UserModel(userData);
    return await user.save();
  }

  async findById(id: string): Promise<IUser | null> {
    return await UserModel.findById(id);
  }

  async findAll(): Promise<IUser[]> {
    return await UserModel.find();
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ users: IUser[]; total: number }> {
    const query: any = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      UserModel.countDocuments(query),
    ]);

    return { users, total };
  }

  async update(id: string, data: Partial<UserType>): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}