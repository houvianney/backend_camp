import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    this.logger.log(`[AUTH] Login attempt email=${email}`);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.actif) {
      this.logger.warn(`[AUTH] Login failed email=${email} reason=user_not_found_or_inactive`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      this.logger.warn(`[AUTH] Login failed email=${email} reason=invalid_password`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      localiteId: user.localiteId,
      controleType: user.controleType,
    };

    this.logger.log(`[AUTH] Login success email=${email} role=${user.role} controleType=${user.controleType ?? 'NONE'}`);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        localiteId: user.localiteId,
        controleType: user.controleType,
      },
    };
  }
}
