import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

class UpdateRessourceDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsEnum(ControleType) type?: ControleType;
  @IsOptional() @IsInt() @Min(1) jour?: number | null;
  @IsOptional() @IsString() creneau?: string | null;
  @IsOptional() visible?: boolean;
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
  findAll(@Query('type') type?: ControleType, @Query('visible') visible?: string) {
    const visibleBool = visible === undefined ? undefined : visible === 'true';
    return this.ressourcesService.findAll(type, visibleBool);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  stats() {
    return this.ressourcesService.statsDistribution();
  }

  @Get(':id/participants')
  @Roles(Role.ADMIN)
  participants(@Param('id') id: string) {
    return this.ressourcesService.participantsParRessource(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.ressourcesService.delete(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateRessourceDto) {
    return this.ressourcesService.update(id, dto as any);
  }
}
