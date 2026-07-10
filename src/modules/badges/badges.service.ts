import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BadgesService {
  constructor(private prisma: PrismaService) {}

  private genererToken(): string {
    // Token opaque (pas d'info participant lisible dans le QR)
    return randomBytes(24).toString('hex');
  }

  /** Génère le badge initial d'un participant (appelé uniquement à la validation admin) */
  async genererBadge(participantId: string) {
    const qrCode = this.genererToken();
    return this.prisma.badge.create({
      data: { participantId, qrCode, statut: 'ACTIF' },
    });
  }

  /**
   * Badge perdu: révoque l'ancien badge ACTIF et en crée un nouveau,
   * sans dupliquer le participant. Transaction pour garantir l'atomicité
   * (évite d'avoir 2 badges ACTIF en même temps, en plus de l'index partiel en base).
   */
  async regenererBadge(participantId: string, adminId: string) {
    const ancien = await this.prisma.badge.findFirst({
      where: { participantId, statut: 'ACTIF' },
    });
    if (!ancien) {
      throw new NotFoundException('Aucun badge actif trouvé pour ce participant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.badge.update({
        where: { id: ancien.id },
        data: { statut: 'REVOQUE', revokedAt: new Date(), revokedById: adminId },
      });

      return tx.badge.create({
        data: {
          participantId,
          qrCode: this.genererToken(),
          statut: 'ACTIF',
        },
      });
    });
  }

  /** Génère l'image PNG (data URL) du QR code, à imprimer sur le badge PDF */
  async genererImageQr(qrCode: string): Promise<string> {
    return QRCode.toDataURL(qrCode, { margin: 1, width: 300 });
  }

  historique(participantId: string) {
    return this.prisma.badge.findMany({
      where: { participantId },
      orderBy: { createdAt: 'desc' },
      include: { revokedBy: true },
    });
  }

  async getQrDataUrl(participantId: string) {
    const badge = await this.prisma.badge.findFirst({
      where: { participantId, statut: 'ACTIF' },
    });

    if (!badge) {
      throw new NotFoundException('Aucun badge actif trouvé pour ce participant');
    }

    return this.genererImageQr(badge.qrCode);
  }

  /**
   * Consultation publique (sans authentification): un participant qui a son
   * QR/lien peut voir ses propres infos + ce qu'il a deja recu.
   * Aucune donnee sensible d'autres participants n'est jamais exposee ici.
   */
  async consulterParQr(qrCode: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { qrCode },
      include: {
        participant: {
          include: {
            distributions: { include: { ressource: true } },
          },
        },
      },
    });

    if (!badge || badge.statut !== 'ACTIF') {
      throw new NotFoundException('Badge invalide, revoque, ou introuvable');
    }

    const { participant } = badge;
    return {
      nom: participant.nom,
      prenom: participant.prenom,
      sexe: participant.sexe,
      typeParticipant: participant.typeParticipant,
      statut: participant.statut,
      tailleTshirt: participant.tailleTshirt,
      ressourcesRecues: participant.distributions.map((d) => ({
        code: d.ressource.code,
        libelle: d.ressource.libelle,
        recuLe: d.scannedAt,
      })),
    };
  }
}
