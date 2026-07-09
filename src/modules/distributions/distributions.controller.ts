import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DistributionsService } from './distributions.service';

class ScanDto {
  @IsString()
  qrCode: string;
}

class ValiderDto {
  @IsString()
  participantId: string;

  @IsString()
  ressourceId: string;
}

@Controller('distributions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONTROLEUR)
export class DistributionsController {
  constructor(private distributionsService: DistributionsService) {}

  @Post('scan')
  scan(@Body() dto: ScanDto, @Req() req: any) {
    return this.distributionsService.lookupByQrCode(dto.qrCode, req.user.id);
  }

  @Post('valider')
  valider(@Body() dto: ValiderDto, @Req() req: any) {
    return this.distributionsService.valider(dto.participantId, dto.ressourceId, req.user.id);
  }
}
