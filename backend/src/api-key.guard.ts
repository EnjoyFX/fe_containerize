import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const expected = process.env.API_KEY;

    if (!expected) return true;
    if (apiKey === expected) return true;

    throw new UnauthorizedException('Invalid or missing API key');
  }
}
