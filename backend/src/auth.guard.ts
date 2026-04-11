import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.JWT_SECRET || process.env.AUTH_PASSWORD;
    if (!secret) return true;

    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      jwt.verify(header.slice(7), secret);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
