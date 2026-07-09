import { Module } from '@nestjs/common';
import { LocalitesController } from './localites.controller';
import { LocalitesService } from './localites.service';

@Module({
  controllers: [LocalitesController],
  providers: [LocalitesService],
  exports: [LocalitesService],
})
export class LocalitesModule {}
