import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ControleType } from '../../common/enums/role.enum';

@Injectable()
export class RessourcesService {
  constructor(private prisma: PrismaService) {}

  create(data: { code: string; type: ControleType; libelle: string; jour?: number; creneau?: string }) {
    return this.prisma.ressource.create({ data });
  }

  findAll(type?: ControleType) {
    return this.prisma.ressource.findMany({
      where: { type },
      orderBy: [{ jour: 'asc' }, { creneau: 'asc' }],
    });
  }

  /** Statistiques de distribution par ressource, pour le dashboard admin temps réel */
  async statsDistribution() {
    const ressources = await this.prisma.ressource.findMany({
      include: { _count: { select: { distributions: true } } },
    });
    return ressources.map((r) => ({
      id: r.id,
      code: r.code,
      libelle: r.libelle,
      type: r.type,
      totalDistribue: r._count.distributions,
    }));
  }

  async delete(id: string) {
    await this.prisma.distribution.deleteMany({ where: { ressourceId: id } });
    return this.prisma.ressource.delete({ where: { id } });
  }
}
