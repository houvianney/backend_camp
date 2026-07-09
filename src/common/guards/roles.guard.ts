import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

/**
 * S'appuie sur req.user injecté par JwtAuthGuard (voir modules/auth).
 * req.user doit contenir { id, role, localiteId?, controleType? }.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // route publique vis-à-vis des rôles
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const effectiveRoles = requiredRoles.includes(Role.ADMIN)
      ? [...requiredRoles, Role.ADMIN_SECONDARY]
      : requiredRoles;

    if (!effectiveRoles.includes(user.role)) {
      throw new ForbiddenException("Vous n'avez pas les droits pour cette action");
    }
    return true;
  }
}
