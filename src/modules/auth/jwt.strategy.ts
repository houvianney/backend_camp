import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change_this_secret',
    });
  }

  // Le retour de validate() devient req.user, utilisé par RolesGuard
  async validate(payload: any) {
    return {
      id: payload.sub,
      role: payload.role,
      localiteId: payload.localiteId,
      controleType: payload.controleType,
      actif: payload.actif,
    };
  }
}
