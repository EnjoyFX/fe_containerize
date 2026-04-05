import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(8000, '0.0.0.0');
}
bootstrap();
