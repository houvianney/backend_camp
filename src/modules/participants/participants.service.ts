import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';

interface CreateParticipantInput {
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  sexe?: 'M' | 'F';
  age?: number;
  profession?: string;
  adresse?: string;
  contact?: string;
  membreOng?: boolean;
  typeParticipant?: 'PARTICIPANT' | 'STAFF' | 'ENSEIGNANT' | 'VOLONTAIRE';
  typeStaff?: 'Entretien' | 'Podium' | 'Formateur Académie' | 'Media' | 'Cuisine' | 'Accueil' | 'Sécurité' | 'Prestations' | 'Inscription' | 'Organisateurs';
  tailleTshirt?: string;
  montantTotal: number;
  montantPaye: number;
  localiteId?: string;
}

@Injectable()
export class ParticipantsService {
  constructor(
    private prisma: PrismaService,
    private badgesService: BadgesService,
  ) {}

  /** Le responsable inscrit un participant de SA localité uniquement */
  async inscrireParResponsable(responsableId: string, data: CreateParticipantInput) {
    // If called by admin, responsableId will be admin id; handle in controller by passing role if needed
    const responsable = await this.prisma.user.findUnique({ where: { id: responsableId } });
    if (!responsable) {
      throw new ForbiddenException('Compte invalide');
    }

    // If caller is RESPONSABLE, ensure they have a localite and ignore any provided localiteId
    const callerRole = (responsable.role || '').toString();
    let localiteForParticipant = responsable.localiteId;
    if (callerRole === 'RESPONSABLE') {
      if (!responsable.localiteId) throw new ForbiddenException('Compte responsable invalide');
    } else if (callerRole === 'ADMIN') {
      if (!data.localiteId) throw new BadRequestException('localiteId requis pour création par admin');
      if (!data.nom || !data.prenom || !data.contact || !data.sexe || !data.typeParticipant) {
        throw new BadRequestException('Nom, prénom, sexe, contact et type sont obligatoires pour la création par admin.');
      }
      localiteForParticipant = data.localiteId;
    } else {
      throw new ForbiddenException('Droits insuffisants');
    }

    if (data.typeParticipant === 'STAFF' && !data.typeStaff) {
      throw new BadRequestException('Le type de staff est obligatoire pour les participants de type STAFF.');
    }

    const participantData: Prisma.ParticipantUncheckedCreateInput = {
      ...data,
      localiteId: localiteForParticipant as string,
      inscritParId: responsable.id,
      statut: callerRole === 'ADMIN' ? 'VALIDE' : 'EN_ATTENTE',
      valideParId: callerRole === 'ADMIN' ? responsable.id : undefined,
      valideAt: callerRole === 'ADMIN' ? new Date() : undefined,
      typeStaff: data.typeParticipant === 'STAFF' ? data.typeStaff : undefined,
    };

    const participant = await this.prisma.participant.create({
      data: participantData,
    });

    if (callerRole === 'ADMIN') {
      await this.badgesService.genererBadge(participant.id);
    }

    return participant;
  }

  /** Le responsable met à jour le montant payé par tranche, uniquement si encore EN_ATTENTE */
  async mettreAJourMontant(responsableId: string, participantId: string, montantAjoute: number) {
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('Participant introuvable');

    const responsable = await this.prisma.user.findUnique({ where: { id: responsableId } });
    if (participant.localiteId !== responsable?.localiteId) {
      throw new ForbiddenException("Ce participant n'appartient pas à votre localité");
    }
    if (participant.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Ce participant est déjà validé, modification impossible');
    }

    const montantActuel = Number(participant.montantPaye || 0);
    const nouveauMontant = montantActuel + montantAjoute;

    return this.prisma.participant.update({
      where: { id: participantId },
      data: { montantPaye: nouveauMontant },
    });
  }

  /** Liste des participants d'une localité (vue du responsable) */
  listeParLocalite(localiteId: string) {
    console.log('[DEBUG] listeParLocalite called with localiteId=', localiteId);
    try {
      return this.prisma.participant.findMany({
        where: { localiteId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('[DEBUG] prisma.participant.findMany error for localiteId=', localiteId, err);
      throw err;
    }
  }

  async supprimerParResponsable(responsableId: string, participantId: string, callerRole?: string) {
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('Participant introuvable');

    const caller = await this.prisma.user.findUnique({ where: { id: responsableId } });
    if (!caller) throw new ForbiddenException('Compte invalide');

    // Admin can delete any participant. Responsable only if same localite and still EN_ATTENTE
    if (caller.role === 'ADMIN' || callerRole === 'ADMIN') {
      await this.prisma.distribution.deleteMany({ where: { participantId } });
      await this.prisma.badge.deleteMany({ where: { participantId } });
      return this.prisma.participant.delete({ where: { id: participantId } });
    }

    if (participant.localiteId !== caller?.localiteId) {
      throw new ForbiddenException("Ce participant n'appartient pas à votre localité");
    }
    if (participant.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Ce participant est déjà validé, suppression impossible');
    }

    await this.prisma.distribution.deleteMany({ where: { participantId } });
    await this.prisma.badge.deleteMany({ where: { participantId } });
    return this.prisma.participant.delete({ where: { id: participantId } });
  }

  /** Mettre à jour un participant par le responsable (sa localité) ou par l'admin */
  async mettreAJourParticipant(user: any, participantId: string, data: Partial<CreateParticipantInput>) {
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('Participant introuvable');

    const caller = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!caller) throw new ForbiddenException('Compte invalide');

    if (caller.role === 'RESPONSABLE') {
      if (participant.localiteId !== caller.localiteId) throw new ForbiddenException("Ce participant n'appartient pas à votre localité");
      if (participant.statut !== 'EN_ATTENTE') throw new BadRequestException('Ce participant est déjà validé, modification impossible');
    }

    const allowed: any = { ...data };
    delete allowed.statut;

    return this.prisma.participant.update({ where: { id: participantId }, data: allowed as any });
  }

  /** Vue admin: liste globale, filtrable par statut/localité */
  listeGlobale(filters: { statut?: 'EN_ATTENTE' | 'VALIDE'; localiteId?: string }) {
    return this.prisma.participant.findMany({
      where: {
        statut: filters.statut,
        localiteId: filters.localiteId,
      },
      include: {
        localite: true,
        inscritPar: {
          select: { id: true, nom: true, prenom: true, role: true },
        },
        validePar: {
          select: { id: true, nom: true, prenom: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validation admin: fait passer le participant en VALIDE
   * et génère son badge (QR code) à ce moment précis seulement.
   */
  async validerParAdmin(adminId: string, participantId: string) {
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('Participant introuvable');
    if (participant.statut === 'VALIDE') {
      throw new BadRequestException('Participant déjà validé');
    }

    const updated = await this.prisma.participant.update({
      where: { id: participantId },
      data: {
        statut: 'VALIDE',
        valideParId: adminId,
        valideAt: new Date(),
      },
    });

    const badge = await this.badgesService.genererBadge(participant.id);

    return { participant: updated, badge };
  }

  async validerPlusieursParAdmin(adminId: string, participantIds: string[]) {
    if (!participantIds?.length) {
      throw new BadRequestException('Aucun participant sélectionné');
    }

    const resultats = [] as Array<{ participant: any; badge: any }>;

    for (const participantId of participantIds) {
      const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
      if (!participant) continue;
      if (participant.statut === 'VALIDE') continue;

      const updated = await this.prisma.participant.update({
        where: { id: participantId },
        data: {
          statut: 'VALIDE',
          valideParId: adminId,
          valideAt: new Date(),
        },
      });

      const badge = await this.badgesService.genererBadge(participant.id);
      resultats.push({ participant: updated, badge });
    }

    return resultats;
  }
}
