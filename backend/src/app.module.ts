import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ItemsModule } from './items/items.module';
import { Item } from './items/item.entity';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'db',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'appuser',
      password: process.env.DB_PASSWORD || 'apppass',
      database: process.env.DB_NAME || 'appdb',
      entities: [Item],
      synchronize: false,
    }),
    ItemsModule,
  ],
  controllers: [AuthController],
})
export class AppModule {}
