import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgrammeService {
  constructor(private prisma: PrismaService) {}

  create(data: { jour: number; heureDebut: string; heureFin?: string; titre: string; lieu?: string; description?: string }) {
    return this.prisma.programmeItem.create({ data });
  }

  findAll() {
    return this.prisma.programmeItem.findMany({
      orderBy: [{ jour: 'asc' }, { heureDebut: 'asc' }],
    });
  }
}
