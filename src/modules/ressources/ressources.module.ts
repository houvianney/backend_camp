import { Module } from '@nestjs/common';
import { RessourcesController } from './ressources.controller';
import { RessourcesService } from './ressources.service';

@Module({
  controllers: [RessourcesController],
  providers: [RessourcesService],
  exports: [RessourcesService],
})
export class RessourcesModule {}
