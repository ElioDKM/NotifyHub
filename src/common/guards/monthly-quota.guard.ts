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

function monthKeyUTC(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}${mm}`;
}

@Injectable()
export class MonthlyQuotaGuard implements CanActivate {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<requestWithTenant.RequestWithTenant>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const tenant = req.tenant;
    if (!tenant) return true;

    const plan = (tenant.plan ?? 'FREE') as Plan;
    const limit =
      PLAN_LIMITS[plan]?.monthlyNotifQuota ??
      PLAN_LIMITS.FREE.monthlyNotifQuota;

    const key = `quota:notif:${tenant.id}:${monthKeyUTC()}`;

    const used = await this.redis.incr(key);
    // expire “large” (40 jours) pour couvrir le mois + marge
    if (used === 1) await this.redis.expire(key, 60 * 60 * 24 * 40);

    const remaining = Math.max(0, limit - used);

    res.setHeader('X-Quota-Monthly-Limit', String(limit));
    res.setHeader('X-Quota-Monthly-Used', String(used));
    res.setHeader('X-Quota-Monthly-Remaining', String(remaining));

    if (used > limit) {
      throw new HttpException(
        'MonthlyQuotaExceeded: Upgrade plan or wait for reset',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
