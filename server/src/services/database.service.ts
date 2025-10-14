// import { PrismaClient } from '../generated/prisma';
import mongoose from 'mongoose';
import TechPack from '../models/techpack.model';
import User from '../models/user.model';
import Activity from '../models/activity.model';

export type DatabaseProvider = 'mongodb' | 'postgresql';

export interface DatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // User operations
  createUser(data: any): Promise<any>;
  findUserByEmail(email: string): Promise<any>;
  findUserById(id: string): Promise<any>;
  
  // TechPack operations
  createTechPack(data: any): Promise<any>;
  findTechPacks(filters: any, pagination: any): Promise<{ data: any[], total: number }>;
  findTechPackById(id: string): Promise<any>;
  updateTechPack(id: string, data: any): Promise<any>;
  deleteTechPack(id: string): Promise<any>;
  bulkUpdateTechPacks(ids: string[], data: any): Promise<number>;
  
  // Activity operations
  createActivity(data: any): Promise<any>;
  findActivities(filters: any): Promise<any[]>;
}

/*
class PostgreSQLService implements DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async createUser(data: any): Promise<any> {
    return await this.prisma.user.create({ data });
  }

  async findUserByEmail(email: string): Promise<any> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<any> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async createTechPack(data: any): Promise<any> {
    return await this.prisma.techPack.create({ 
      data,
      include: { owner: true }
    });
  }

  async findTechPacks(filters: any, pagination: any): Promise<{ data: any[], total: number }> {
    const where: any = { isDeleted: false };
    
    if (filters.status) where.status = filters.status;
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { articleCode: { contains: filters.q, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.techPack.findMany({
        where,
        include: { owner: true },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [pagination.sortBy || 'updatedAt']: pagination.sortOrder || 'desc' }
      }),
      this.prisma.techPack.count({ where })
    ]);

    return { data, total };
  }

  async findTechPackById(id: string): Promise<any> {
    return await this.prisma.techPack.findUnique({
      where: { id },
      include: { owner: true }
    });
  }

  async updateTechPack(id: string, data: any): Promise<any> {
    return await this.prisma.techPack.update({
      where: { id },
      data,
      include: { owner: true }
    });
  }

  async deleteTechPack(id: string): Promise<any> {
    return await this.prisma.techPack.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  async bulkUpdateTechPacks(ids: string[], data: any): Promise<number> {
    const result = await this.prisma.techPack.updateMany({
      where: { id: { in: ids } },
      data
    });
    return result.count;
  }

  async createActivity(data: any): Promise<any> {
    return await this.prisma.activity.create({ data });
  }

  async findActivities(filters: any): Promise<any[]> {
    return await this.prisma.activity.findMany({
      where: filters,
      include: { user: true, techPack: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
*/

class MongoDBService implements DatabaseService {
  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/techpack';
    await mongoose.connect(mongoUri);
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  async createUser(data: any): Promise<any> {
    const user = new User(data);
    return await user.save();
  }

  async findUserByEmail(email: string): Promise<any> {
    return await User.findOne({ email });
  }

  async findUserById(id: string): Promise<any> {
    return await User.findById(id);
  }

  async createTechPack(data: any): Promise<any> {
    const techPack = new TechPack(data);
    return await techPack.save();
  }

  async findTechPacks(filters: any, pagination: any): Promise<{ data: any[], total: number }> {
    const query: any = { isDeleted: { $ne: true } };
    
    if (filters.status) query.status = filters.status;
    if (filters.q) {
      query.$or = [
        { name: { $regex: filters.q, $options: 'i' } },
        { articleCode: { $regex: filters.q, $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      TechPack.find(query)
        .populate('ownerId')
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .sort({ [pagination.sortBy || 'updatedAt']: pagination.sortOrder === 'asc' ? 1 : -1 }),
      TechPack.countDocuments(query)
    ]);

    return { data, total };
  }

  async findTechPackById(id: string): Promise<any> {
    return await TechPack.findById(id).populate('ownerId');
  }

  async updateTechPack(id: string, data: any): Promise<any> {
    return await TechPack.findByIdAndUpdate(id, data, { new: true }).populate('ownerId');
  }

  async deleteTechPack(id: string): Promise<any> {
    return await TechPack.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }

  async bulkUpdateTechPacks(ids: string[], data: any): Promise<number> {
    const result = await TechPack.updateMany({ _id: { $in: ids } }, data);
    return result.modifiedCount;
  }

  async createActivity(data: any): Promise<any> {
    const activity = new Activity(data);
    return await activity.save();
  }

  async findActivities(filters: any): Promise<any[]> {
    return await Activity.find(filters)
      .populate('userId')
      .populate('techPackId')
      .sort({ createdAt: -1 });
  }
}

// Database factory
export function createDatabaseService(): DatabaseService {
  const provider = (process.env.DB_PROVIDER as DatabaseProvider) || 'mongodb';

  switch (provider) {
    // case 'postgresql':
    //   return new PostgreSQLService();
    case 'mongodb':
      return new MongoDBService();
    default:
      return new MongoDBService(); // Default to MongoDB for now
  }
}

export const db = createDatabaseService();
