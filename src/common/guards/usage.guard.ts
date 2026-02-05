import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import type * as requestWithTenant from 'src/common/types/request-with-tenant';
import { PLAN_LIMITS, type Plan } from '../usage/plan-limits';

function currentMinuteKey(): number {
  return Math.floor(Date.now() / 60_000);
}

function resetInSeconds(): number {
  return 60 - Math.floor((Date.now() % 60_000) / 1000);
}

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<requestWithTenant.RequestWithTenant>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const tenant = req.tenant;
    if (!tenant) return true;

    const plan = (tenant.plan ?? 'FREE') as Plan;
    const limit = PLAN_LIMITS[plan]?.reqPerMin ?? PLAN_LIMITS.FREE.reqPerMin;

    const key = `rl:${tenant.id}:${currentMinuteKey()}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }

    const remaining = Math.max(0, limit - count);
    const reset = resetInSeconds();

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(reset));

    if (count > limit) {
      res.setHeader('Retry-After', String(reset));
      throw new HttpException(
        'RateLimitExceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
