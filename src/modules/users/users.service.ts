import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ControleType } from '../../common/enums/role.enum';

interface CreateUserInput {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  password: string;
  role: Role;
  localiteId?: string; // requis si RESPONSABLE
  controleType?: ControleType; // requis si CONTROLEUR
}

interface AuthUser {
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Créé uniquement par l'admin principal, sauf pour les comptes responsables/contrôleurs */
  async create(data: CreateUserInput, currentUser?: AuthUser) {
    const isPrincipalAdmin = currentUser?.role === Role.ADMIN;

    if ([Role.ADMIN, Role.ADMIN_SECONDARY].includes(data.role) && !isPrincipalAdmin) {
      throw new ForbiddenException('Seul l’admin principal peut créer un compte administrateur');
    }

    if (data.role === Role.RESPONSABLE && !data.localiteId) {
      throw new BadRequestException('Un responsable doit être rattaché à une localité');
    }
    if (data.role === Role.CONTROLEUR && !data.controleType) {
      throw new BadRequestException("Un contrôleur doit avoir un type de contrôle (présence/tshirt/nourriture)");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        passwordHash,
        passwordMustChange: [Role.ADMIN, Role.ADMIN_SECONDARY, Role.RESPONSABLE, Role.CONTROLEUR].includes(data.role),
        role: data.role,
        localiteId: data.localiteId,
        controleType: data.controleType,
      },
    });
  }

  findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: { role },
      include: { localite: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  desactiver(id: string) {
    return this.prisma.user.update({ where: { id }, data: { actif: false } });
  }

  async delete(id: string) {
    const participantLinks = await this.prisma.participant.count({
      where: {
        OR: [{ inscritParId: id }, { valideParId: id }],
      },
    });

    if (participantLinks > 0) {
      throw new BadRequestException('Impossible de supprimer cet utilisateur : il est lié à des inscriptions ou validations.');
    }

    await this.prisma.distribution.deleteMany({ where: { controleurId: id } });
    return this.prisma.user.delete({ where: { id } });
  }
}
