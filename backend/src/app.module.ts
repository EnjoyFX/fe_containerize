import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsModule } from './items/items.module';
import { Item } from './items/item.entity';

@Module({
  imports: [
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
})
export class AppModule {}
