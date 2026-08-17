import { ConflictException, Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DistributionsService {
  private readonly logger = new Logger(DistributionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Etape 1 du scan: le controleur scanne le QR code.
   * On retrouve le participant + son historique de distributions,
   * filtré sur le type de ressource dont CE controleur a la charge
   * (un controleur "TSHIRT" ne doit voir que l'info tshirt, etc.)
   */
  async lookupByQrCode(qrCode: string, controleurId: string) {
    this.logger.log(`[SCAN] lookup start qrCode=${qrCode} controleurId=${controleurId}`);

    const badge = await this.prisma.badge.findUnique({
      where: { qrCode },
      include: { participant: true },
    });

    if (!badge || badge.statut !== 'ACTIF') {
      this.logger.warn(`[SCAN] lookup failed qrCode=${qrCode} reason=badge_not_found_or_revoked`);
      throw new NotFoundException('QR code invalide ou révoqué');
    }
    if (badge.participant.statut !== 'VALIDE') {
      this.logger.warn(`[SCAN] lookup failed qrCode=${qrCode} participantId=${badge.participant.id} reason=participant_not_validated`);
      throw new BadRequestException("Ce participant n'est pas encore validé par l'admin");
    }

    const controleur = await this.prisma.user.findUnique({ where: { id: controleurId } });
    if (!controleur || controleur.role !== 'CONTROLEUR' || !controleur.actif) {
      throw new ForbiddenException('Ce compte est désactivé. Veuillez contacter l’administrateur pour retrouver l’accès.');
    }

    // Ressources pertinentes pour le type de ce contrôleur (ex: tous les créneaux repas)
    const ressources = await this.prisma.ressource.findMany({
      where: { type: controleur.controleType!, visible: true },
      orderBy: [{ jour: 'asc' }, { creneau: 'asc' }],
    });

    const distributionsExistantes = await this.prisma.distribution.findMany({
      where: {
        participantId: badge.participant.id,
        ressourceId: { in: ressources.map((r) => r.id) },
      },
    });

    const dejaConsomme = new Set(distributionsExistantes.map((d) => d.ressourceId));
    this.logger.log(`[SCAN] lookup success participantId=${badge.participant.id} typeControle=${controleur.controleType} resources=${ressources.length}`);

    return {
      participant: {
        id: badge.participant.id,
        nom: badge.participant.nom,
        prenom: badge.participant.prenom,
        sexe: badge.participant.sexe,
        typeParticipant: badge.participant.typeParticipant,
        tailleTshirt: badge.participant.tailleTshirt,
      },
      typeControle: controleur.controleType,
      ressources: ressources.map((r) => ({
        id: r.id,
        code: r.code,
        libelle: r.libelle,
        jour: r.jour,
        creneau: r.creneau,
        dejaDistribue: dejaConsomme.has(r.id),
      })),
    };
  }

  /**
   * Etape 2 du scan: le controleur valide la distribution pour UNE ressource précise.
   * La contrainte unique (participant_id, ressource_id) empêche la double validation
   * même si deux scans arrivent au même moment sur deux postes différents.
   */
  async valider(participantId: string, ressourceId: string, controleurId: string) {
    this.logger.log(`[VALIDATE] attempt controllerId=${controleurId} participantId=${participantId} ressourceId=${ressourceId}`);

    const controleur = await this.prisma.user.findUnique({ where: { id: controleurId } });
    if (!controleur || controleur.role !== 'CONTROLEUR' || !controleur.actif) {
      throw new ForbiddenException('Ce compte est désactivé. Veuillez contacter l’administrateur pour retrouver l’accès.');
    }

    const ressource = await this.prisma.ressource.findUnique({ where: { id: ressourceId } });
    if (!ressource || !controleur.controleType || ressource.type !== controleur.controleType) {
      this.logger.warn(`[VALIDATE] rejected controllerId=${controleurId} participantId=${participantId} ressourceId=${ressourceId} reason=resource_type_mismatch`);
      throw new BadRequestException('Cette ressource ne correspond pas au type de contrôle de ce compte');
    }

    // Si la ressource est de type NOURRITURE, vérifier que la présence a déjà été marquée
    if (ressource.type === 'NOURRITURE') {
      const presenceDistribution = await this.prisma.distribution.findFirst({
        where: {
          participantId,
          ressource: { type: 'PRESENCE' },
        },
      });
      if (!presenceDistribution) {
        this.logger.warn(`[VALIDATE] rejected controllerId=${controleurId} participantId=${participantId} ressourceId=${ressourceId} reason=presence_required`);
        throw new BadRequestException("Présence non marquée : redirigez d'abord le participant vers le contrôle de présence");
      }
    }

    try {
      const distribution = await this.prisma.distribution.create({
        data: { participantId, ressourceId, controleurId },
      });
      this.logger.log(`[VALIDATE] success controllerId=${controleurId} participantId=${participantId} ressourceId=${ressourceId}`);
      return { success: true, distribution };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Violation de la contrainte unique -> déjà distribué
        const existante = await this.prisma.distribution.findUnique({
          where: { uniq_participant_ressource: { participantId, ressourceId } } as any,
          include: { controleur: true },
        });
        this.logger.warn(`[VALIDATE] duplicate controllerId=${controleurId} participantId=${participantId} ressourceId=${ressourceId}`);
        throw new ConflictException(
          existante
            ? `Déjà remis le ${existante.scannedAt.toLocaleString('fr-FR')} par ${existante.controleur.prenom} ${existante.controleur.nom}`
            : 'Déjà remis précédemment',
        );
      }
      throw err;
    }
  }
}
