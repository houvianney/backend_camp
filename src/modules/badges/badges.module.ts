import { Module } from '@nestjs/common';
import { BadgesController } from './badges.controller';
import { PublicBadgesController } from './public-badges.controller';
import { BadgesService } from './badges.service';

@Module({
  controllers: [BadgesController, PublicBadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
