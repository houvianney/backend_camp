import { Module } from '@nestjs/common';
import { RedisCacheService } from '../../common/cache/redis.service';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';

@Module({
  controllers: [AlbumsController],
  providers: [AlbumsService, RedisCacheService],
})
export class AlbumsModule {}
