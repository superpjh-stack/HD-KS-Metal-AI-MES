import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@ks-mes/common';
import { AuditInterceptor } from '@ks-mes/audit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new AuditInterceptor());

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://mes.ks-precision.com']
      : ['http://localhost:3000'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`master-service running on port ${port}`);
}

bootstrap();
