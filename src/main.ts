import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'net';
import path from 'path';
import { AppModule } from './app.module';
import { RedisCacheService } from './common/cache/redis.service';

async function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(error);
      }
    });
    server.once('listening', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address !== 'string') {
          resolve(address.port);
        } else {
          resolve(startPort);
        }
      });
    });
    server.listen(startPort);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

  app.enableCors();
  const redisCacheService = app.get(RedisCacheService);
  await redisCacheService.connect();

  const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de requêtes, veuillez patienter.' },
  });

  app.use('/api/public', publicLimiter);
  app.use('/api/albums', publicLimiter);
  app.use((req: any, res: any, next: any) => {
    const startedAt = Date.now();
    logger.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    res.on('finish', () => {
      logger.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
    });
    next();
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  const requestedPort = Number(process.env.PORT || 3000);
  const port = await getAvailablePort(requestedPort);
  await app.listen(port);
  console.log(`API démarrée sur http://localhost:${port}/api`);
}
bootstrap();
