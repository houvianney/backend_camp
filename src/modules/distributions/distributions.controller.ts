import { Body, Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DistributionsService } from './distributions.service';

class ScanDto {
  @IsString()
  qrCode!: string;
}

class ValiderDto {
  @IsString()
  participantId!: string;

  @IsString()
  ressourceId!: string;
}

@Controller('distributions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONTROLEUR)
export class DistributionsController {
  private readonly logger = new Logger(DistributionsController.name);

  constructor(private distributionsService: DistributionsService) {}

  @Post('scan')
  scan(@Body() dto: ScanDto, @Req() req: any) {
    this.logger.log(`[SCAN-REQ] controllerId=${req.user?.id} qrCode=${dto.qrCode}`);
    return this.distributionsService.lookupByQrCode(dto.qrCode, req.user.id);
  }

  @Post('valider')
  valider(@Body() dto: ValiderDto, @Req() req: any) {
    this.logger.log(`[VALIDATE-REQ] controllerId=${req.user?.id} participantId=${dto.participantId} ressourceId=${dto.ressourceId}`);
    return this.distributionsService.valider(dto.participantId, dto.ressourceId, req.user.id);
  }
}
