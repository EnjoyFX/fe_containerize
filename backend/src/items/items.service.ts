import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Item } from './item.entity';
import { CreateItemDto } from './create-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Item[]> {
    return this.itemsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateItemDto): Promise<Item> {
    const item = this.itemsRepo.create({
      name: dto.name,
      description: dto.description ?? '',
    });
    return this.itemsRepo.save(item);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.itemsRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async isDatabaseHealthy(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async checkHealth(): Promise<{ status: string; database: string }> {
    const healthy = await this.isDatabaseHealthy();
    return healthy
      ? { status: 'ok', database: 'connected' }
      : { status: 'degraded', database: 'disconnected' };
  }
}
