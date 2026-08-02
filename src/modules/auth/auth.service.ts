import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
    if (!user) {
      this.logger.warn(`[AUTH] Login failed email=${email} reason=user_not_found`);
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
      actif: user.actif,
    };

    this.logger.log(`[AUTH] Login success email=${email} role=${user.role} controleType=${user.controleType ?? 'NONE'} requiresPasswordChange=${user.passwordMustChange}`);

    return {
      access_token: this.jwtService.sign(payload),
      requiresPasswordChange: user.passwordMustChange,
      accountDisabled: !user.actif,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        localiteId: user.localiteId,
        controleType: user.controleType,
        actif: user.actif,
        passwordMustChange: user.passwordMustChange,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      throw new BadRequestException('L’ancien et le nouveau mot de passe sont requis, avec au moins 6 caractères');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.actif) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('L’ancien mot de passe est incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordPlain: newPassword,
        passwordMustChange: false,
      },
    });

    return { success: true };
  }
}
