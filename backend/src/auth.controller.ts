import { Controller, Post, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';

@Controller()
export class AuthController {
  @Post('auth/login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() body: { username: string; password: string }) {
    const expectedUser = process.env.AUTH_USER || 'admin';
    const expectedPass = process.env.AUTH_PASSWORD;

    if (!expectedPass) {
      throw new UnauthorizedException('Auth not configured');
    }

    if (body.username !== expectedUser || body.password !== expectedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = process.env.JWT_SECRET || expectedPass;
    const token = jwt.sign({ sub: expectedUser }, secret, { expiresIn: '24h' });

    return { token };
  }
}
