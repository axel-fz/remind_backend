import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const rawFrontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  const frontendUrl = rawFrontendUrl.replace(/\/+$/, '');

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on port ${port}`);
}

await bootstrap();