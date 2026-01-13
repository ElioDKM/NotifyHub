import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestWithTenant } from '../types/request-with-tenant';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing x-api-key');
    }

    const hashedKey = createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await this.prisma.api_key.findUnique({
      where: { key: hashedKey },
      include: { tenant: true },
    });

    if (!keyRecord) {
      throw new ForbiddenException('API key not found');
    }

    if (!keyRecord.is_active) {
      throw new ForbiddenException('API key inactive');
    }

    if (keyRecord.tenant.is_suspended) {
      throw new ForbiddenException('Tenant suspended');
    }

    request.tenant = keyRecord.tenant;

    return true;
  }
}
