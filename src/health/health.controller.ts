import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    // 1) Check Postgres
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('DB_UNAVAILABLE');
    }

    // 2) Check Redis
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    const redis = new Redis({ host, port, maxRetriesPerRequest: 1 });

    try {
      const pong = await redis.ping();
      if (pong !== 'PONG') {
        throw new Error('REDIS_BAD_PONG');
      }
    } catch {
      throw new ServiceUnavailableException('REDIS_UNAVAILABLE');
    } finally {
      redis.disconnect();
    }

    return {
      status: 'ok',
      db: 'ok',
      redis: 'ok',
    };
  }
}
