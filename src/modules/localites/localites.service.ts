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
    return localites.map((l) => ({
      id: l.id,
      nom: l.nom,
      totalInscrits: l.participants.length,
      valides: l.participants.filter((p) => p.statut === 'VALIDE').length,
      enAttente: l.participants.filter((p) => p.statut === 'EN_ATTENTE').length,
      montantCollecte: l.participants.reduce((sum, p) => sum + Number(p.montantPaye), 0),
    }));
  }

  async delete(id: string) {
    await this.prisma.participant.deleteMany({ where: { localiteId: id } });
    await this.prisma.user.updateMany({ where: { localiteId: id }, data: { localiteId: null } });
    return this.prisma.localite.delete({ where: { id } });
  }
}
