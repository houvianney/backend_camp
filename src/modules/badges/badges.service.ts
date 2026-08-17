import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis.service';

@Injectable()
export class BadgesService {
  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

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

  private buildQrUrl(qrCode: string) {
    const frontendUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    const cleanUrl = frontendUrl.replace(/\/+$/i, '');
    return `${cleanUrl}/participant/${qrCode}`;
  }

  /** Génère l'image PNG (data URL) du QR code, à imprimer sur le badge PDF */
  async genererImageQr(qrCode: string): Promise<string> {
    const url = this.buildQrUrl(qrCode);
    return QRCode.toDataURL(url, { margin: 1, width: 300 });
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

  async genererBadgesAnonymes(adminId: string, payload: { enseignants?: number; staff?: number; participants?: number; volontaires?: number; localiteId?: string }) {
    const enseignants = Math.max(0, Number(payload.enseignants || 0));
    const staff = Math.max(0, Number(payload.staff || 0));
    const participants = Math.max(0, Number(payload.participants || 0));
    const volontaires = Math.max(0, Number(payload.volontaires || 0));

    if (!enseignants && !staff && !participants && !volontaires) {
      throw new BadRequestException('Sélectionnez au moins un badge à générer');
    }

    const localite = payload.localiteId ? await this.prisma.localite.findUnique({ where: { id: payload.localiteId } }) : await this.prisma.localite.findFirst();
    if (!localite) {
      throw new BadRequestException('Aucune localité n’est disponible pour créer les badges anonymes');
    }

    const created: Array<{ id: string; typeParticipant: string; code: string; qrDataUrl: string; anonymousNumber?: number }> = [];

    const batches = [
      { type: 'ENSEIGNANT', count: enseignants },
      { type: 'STAFF', count: staff },
      { type: 'PARTICIPANT', count: participants },
      { type: 'VOLONTAIRE', count: volontaires },
    ] as const;

    for (const batch of batches) {
      for (let index = 0; index < batch.count; index += 1) {
        // Compute next available anonymous number (1..9999)
        let nextNumber = 1;
        const maxItem = await this.prisma.participant.findFirst({
          where: { anonymousNumber: { not: null } },
          orderBy: { anonymousNumber: 'desc' },
          select: { anonymousNumber: true },
        });
        if (maxItem && typeof maxItem.anonymousNumber === 'number') {
          nextNumber = (maxItem.anonymousNumber % 9999) + 1;
        }

        // ensure uniqueness by probing until an unused number is found (rare loops)
        let attempts = 0;
        while (attempts < 10000) {
          const exists = await this.prisma.participant.findFirst({ where: { anonymousNumber: nextNumber } });
          if (!exists) break;
          nextNumber = (nextNumber % 9999) + 1;
          attempts += 1;
        }

        const participant = await this.prisma.participant.create({
          data: {
            nom: '',
            prenom: '',
            contact: `ANON-${batch.type.toLowerCase()}-${index + 1}`,
            typeParticipant: batch.type as any,
            statut: 'VALIDE',
            localiteId: localite.id,
            inscritParId: adminId,
            valideParId: adminId,
            valideAt: new Date(),
            anonymousNumber: nextNumber,
          },
        });

        const badge = await this.genererBadge(participant.id);
        created.push({
          id: participant.id,
          typeParticipant: batch.type,
          code: `ANON-${batch.type.substring(0, 3)}-${String(index + 1).padStart(2, '0')}`,
          qrDataUrl: await this.genererImageQr(badge.qrCode),
          anonymousNumber: nextNumber,
        });
      }
    }

    return created;
  }

  /**
   * Consultation publique (sans authentification): un participant qui a son
   * QR/lien peut voir ses propres infos + ce qu'il a deja recu.
   * Aucune donnee sensible d'autres participants n'est jamais exposee ici.
   */
  async consulterParQr(qrCode: string) {
    const cacheKey = `badge:${qrCode}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

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
    const payload = {
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

    await this.cache.set(cacheKey, payload, 180);
    return payload;
  }
}
