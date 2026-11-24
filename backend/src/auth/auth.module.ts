import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OriginGuard } from './guards/origin.guard';
import { JwtStrategy } from './jwt.strategy';
import { EmployeeEntity } from '../database/entities';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  return secret;
}

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([EmployeeEntity]),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OriginGuard],
  exports: [OriginGuard],
})
export class AuthModule {}
