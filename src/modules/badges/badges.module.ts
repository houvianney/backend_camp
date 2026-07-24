import { Module } from '@nestjs/common';
import { RedisCacheService } from '../../common/cache/redis.service';
import { BadgesController } from './badges.controller';
import { PublicBadgesController } from './public-badges.controller';
import { BadgesService } from './badges.service';

@Module({
  controllers: [BadgesController, PublicBadgesController],
  providers: [BadgesService, RedisCacheService],
  exports: [BadgesService],
})
export class BadgesModule {}
