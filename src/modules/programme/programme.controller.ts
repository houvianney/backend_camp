import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ProgrammeService } from './programme.service';

class CreateProgrammeDto {
  @IsInt() @Min(1) jour: number;
  @IsString() heureDebut: string;
  @IsOptional() @IsString() heureFin?: string;
  @IsString() titre: string;
  @IsOptional() @IsString() lieu?: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('programme')
export class ProgrammeController {
  constructor(private programmeService: ProgrammeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateProgrammeDto) {
    return this.programmeService.create(dto);
  }

  @Get()
  findAll() {
    // accessible publiquement aux participants via leur lien / QR
    return this.programmeService.findAll();
  }
}
