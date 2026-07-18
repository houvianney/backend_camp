import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LocalitesService {
  constructor(private prisma: PrismaService) {}

  create(nom: string, description?: string) {
    return this.prisma.localite.create({ data: { nom, description } });
  }

  findAll() {
    return this.prisma.localite.findMany({ orderBy: { nom: 'asc' } });
  }

  async statsParLocalite() {
    const localites = await this.prisma.localite.findMany({
      include: { participants: true },
    });

    const rows = localites.map((l) => {
      const participants = l.participants ?? [];
      const participantCount = participants.filter((p) => p.typeParticipant === 'PARTICIPANT').length;
      const enseignantCount = participants.filter((p) => p.typeParticipant === 'ENSEIGNANT').length;
      const staffCount = participants.filter((p) => p.typeParticipant === 'STAFF').length;
      const volontaireCount = participants.filter((p) => p.typeParticipant === 'VOLONTAIRE').length;

      return {
        id: l.id,
        nom: l.nom,
        participantCount,
        enseignantCount,
        staffCount,
        volontaireCount,
        totalCount: participantCount + enseignantCount + staffCount + volontaireCount,
        totalInscrits: participants.length,
        valides: participants.filter((p) => p.statut === 'VALIDE').length,
        enAttente: participants.filter((p) => p.statut === 'EN_ATTENTE').length,
        montantCollecte: participants.reduce((sum, p) => sum + Number(p.montantPaye), 0),
      };
    });

    const totals = rows.reduce(
      (acc, row) => ({
        participantCount: acc.participantCount + row.participantCount,
        enseignantCount: acc.enseignantCount + row.enseignantCount,
        staffCount: acc.staffCount + row.staffCount,
        volontaireCount: acc.volontaireCount + row.volontaireCount,
        totalCount: acc.totalCount + row.totalCount,
        montantCollecte: acc.montantCollecte + row.montantCollecte,
      }),
      {
        participantCount: 0,
        enseignantCount: 0,
        staffCount: 0,
        volontaireCount: 0,
        totalCount: 0,
        montantCollecte: 0,
      },
    );

    const montantVolontaires = rows.reduce((sum, row) => sum + row.montantCollecte * 0, 0);
    const montantVolontairesReel = rows.reduce((sum, row) => {
      const volunteersInRow = row.volontaireCount;
      return sum + (volunteersInRow > 0 ? row.montantCollecte : 0);
    }, 0);

    return [
      ...rows,
      {
        id: 'volontaires-summary',
        nom: 'Volontaires',
        participantCount: 0,
        enseignantCount: 0,
        staffCount: 0,
        volontaireCount: totals.volontaireCount,
        totalCount: totals.volontaireCount,
        totalInscrits: totals.volontaireCount,
        valides: 0,
        enAttente: 0,
        montantCollecte: montantVolontairesReel,
        isSummaryRow: true,
      },
      {
        id: 'totals-summary',
        nom: 'Total',
        participantCount: totals.participantCount,
        enseignantCount: totals.enseignantCount,
        staffCount: totals.staffCount,
        volontaireCount: totals.volontaireCount,
        totalCount: totals.totalCount,
        totalInscrits: totals.totalCount,
        valides: 0,
        enAttente: 0,
        montantCollecte: totals.montantCollecte,
        isSummaryRow: true,
      },
    ];
  }

  async delete(id: string) {
    await this.prisma.participant.deleteMany({ where: { localiteId: id } });
    await this.prisma.user.updateMany({ where: { localiteId: id }, data: { localiteId: null } });
    return this.prisma.localite.delete({ where: { id } });
  }
}
