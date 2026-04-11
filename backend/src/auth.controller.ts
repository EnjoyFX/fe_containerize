import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Controller()
export class AuthController {
  @Post('auth/login')
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
