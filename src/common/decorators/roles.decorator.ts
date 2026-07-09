import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Utilisation: @Roles(Role.ADMIN, Role.RESPONSABLE)
 * A poser sur un controller ou une méthode, en complément de RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
