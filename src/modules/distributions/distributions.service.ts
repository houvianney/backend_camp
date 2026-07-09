import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DistributionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Etape 1 du scan: le controleur scanne le QR code.
   * On retrouve le participant + son historique de distributions,
   * filtré sur le type de ressource dont CE controleur a la charge
   * (un controleur "TSHIRT" ne doit voir que l'info tshirt, etc.)
   */
  async lookupByQrCode(qrCode: string, controleurId: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { qrCode },
      include: { participant: true },
    });

    if (!badge || badge.statut !== 'ACTIF') {
      throw new NotFoundException('QR code invalide ou révoqué');
    }
    if (badge.participant.statut !== 'VALIDE') {
      throw new BadRequestException("Ce participant n'est pas encore validé par l'admin");
    }

    const controleur = await this.prisma.user.findUnique({ where: { id: controleurId } });
    if (!controleur || controleur.role !== 'CONTROLEUR') {
      throw new BadRequestException('Compte contrôleur invalide');
    }

    // Ressources pertinentes pour le type de ce contrôleur (ex: tous les créneaux repas)
    const ressources = await this.prisma.ressource.findMany({
      where: { type: controleur.controleType! },
      orderBy: [{ jour: 'asc' }, { creneau: 'asc' }],
    });

    const distributionsExistantes = await this.prisma.distribution.findMany({
      where: {
        participantId: badge.participant.id,
        ressourceId: { in: ressources.map((r) => r.id) },
      },
    });

    const dejaConsomme = new Set(distributionsExistantes.map((d) => d.ressourceId));

    return {
      participant: {
        id: badge.participant.id,
        nom: badge.participant.nom,
        prenom: badge.participant.prenom,
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
    const controleur = await this.prisma.user.findUnique({ where: { id: controleurId } });
    if (!controleur || controleur.role !== 'CONTROLEUR') {
      throw new BadRequestException('Compte contrôleur invalide');
    }

    const ressource = await this.prisma.ressource.findUnique({ where: { id: ressourceId } });
    if (!ressource || !controleur.controleType || ressource.type !== controleur.controleType) {
      throw new BadRequestException('Cette ressource ne correspond pas au type de contrôle de ce compte');
    }

    try {
      const distribution = await this.prisma.distribution.create({
        data: { participantId, ressourceId, controleurId },
      });
      return { success: true, distribution };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Violation de la contrainte unique -> déjà distribué
        const existante = await this.prisma.distribution.findUnique({
          where: { uniq_participant_ressource: { participantId, ressourceId } } as any,
          include: { controleur: true },
        });
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
