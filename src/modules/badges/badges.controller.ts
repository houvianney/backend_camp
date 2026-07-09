import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { BadgesService } from './badges.service';

@Controller('badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BadgesController {
  constructor(private badgesService: BadgesService) {}

  @Post('participant/:participantId/regenerer')
  regenerer(@Param('participantId') participantId: string, @Req() req: any) {
    return this.badgesService.regenererBadge(participantId, req.user.id);
  }

  @Get('participant/:participantId/historique')
  historique(@Param('participantId') participantId: string) {
    return this.badgesService.historique(participantId);
  }

  @Get('participant/:participantId/qr')
  qr(@Param('participantId') participantId: string) {
    return this.badgesService.getQrDataUrl(participantId);
  }
}
