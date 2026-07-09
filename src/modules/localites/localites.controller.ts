import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { LocalitesService } from './localites.service';

class CreateLocaliteDto {
  @IsString() nom: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('localites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocalitesController {
  constructor(private localitesService: LocalitesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateLocaliteDto) {
    return this.localitesService.create(dto.nom, dto.description);
  }

  @Get()
  findAll() {
    return this.localitesService.findAll();
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  stats() {
    return this.localitesService.statsParLocalite();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.localitesService.delete(id);
  }
}
