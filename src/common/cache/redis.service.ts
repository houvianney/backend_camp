import { Global, Injectable, Logger } from '@nestjs/common';

@Global()
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: any;
  private connected = false;

  async connect() {
    if (this.connected) return;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured; cache disabled');
      return;
    }

    try {
      const { createClient } = await import('redis');
      this.client = createClient({ url: redisUrl });
      this.client.on('error', (err: Error) => this.logger.warn(`Redis error: ${err.message}`));
      await this.client.connect();
      this.connected = true;
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.logger.warn(`Redis unavailable: ${(err as Error).message}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis get failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300) {
    if (!this.connected || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string) {
    if (!this.connected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis delete failed for ${key}: ${(err as Error).message}`);
    }
  }
}
