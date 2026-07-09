import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ControleType } from '../../common/enums/role.enum';
import { RessourcesService } from './ressources.service';

class CreateRessourceDto {
  @IsString() code: string;
  @IsEnum(ControleType) type: ControleType;
  @IsString() libelle: string;
  @IsOptional() @IsInt() @Min(1) jour?: number;
  @IsOptional() @IsString() creneau?: string;
}

@Controller('ressources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RessourcesController {
  constructor(private ressourcesService: RessourcesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateRessourceDto) {
    return this.ressourcesService.create(dto);
  }

  @Get()
  findAll(@Query('type') type?: ControleType) {
    return this.ressourcesService.findAll(type);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  stats() {
    return this.ressourcesService.statsDistribution();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.ressourcesService.delete(id);
  }
}
