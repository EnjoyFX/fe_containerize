import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  private static warnedOnce = false;
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.JWT_SECRET || process.env.AUTH_PASSWORD;
    if (!secret) {
      if (!AuthGuard.warnedOnce) {
        this.logger.warn('JWT_SECRET and AUTH_PASSWORD are not set — auth is disabled. Set them in .env for production.');
        AuthGuard.warnedOnce = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    try {
      jwt.verify(header.slice(7), secret);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
