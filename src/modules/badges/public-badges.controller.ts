import { Controller, Get, Param } from '@nestjs/common';
import { BadgesService } from './badges.service';

/**
 * Route publique volontairement séparée du BadgesController (qui est
 * réservé à l'admin). Aucun guard ici: le QR code lui-même sert de clé
 * d'accès, comme un billet. On n'expose que les données du participant
 * concerné, jamais de liste ni d'infos sur d'autres personnes.
 */
@Controller('public/badges')
export class PublicBadgesController {
  constructor(private badgesService: BadgesService) {}

  @Get(':qrCode')
  consulter(@Param('qrCode') qrCode: string) {
    return this.badgesService.consulterParQr(qrCode);
  }
}
