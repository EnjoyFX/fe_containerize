import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  UseGuards,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './create-item.dto';
import { AuthGuard } from '../auth.guard';

@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('health')
  health() {
    return this.itemsService.checkHealth();
  }

  @Get('health/ready')
  async readiness() {
    const healthy = await this.itemsService.isDatabaseHealthy();
    if (!healthy) {
      throw new ServiceUnavailableException('Database is not ready');
    }
    return { status: 'ok' };
  }

  @Get('items')
  @UseGuards(AuthGuard)
  async findAll() {
    const items = await this.itemsService.findAll();
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      created_at: item.createdAt.toISOString(),
    }));
  }

  @Post('items')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async create(@Body() dto: CreateItemDto) {
    const item = await this.itemsService.create(dto);
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      created_at: item.createdAt.toISOString(),
    };
  }

  @Delete('items/:id')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.itemsService.remove(id);
    if (!deleted) throw new NotFoundException('Item not found');
  }
}
