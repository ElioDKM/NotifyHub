import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from 'src/common/redis/redis.module';
import { plan } from '@prisma/client';
import { PLAN_LIMITS } from 'src/common/usage/plan-limits';

function currentMinuteKey(): number {
  return Math.floor(Date.now() / 60_000);
}

function resetInSeconds(): number {
  return 60 - Math.floor((Date.now() % 60_000) / 1000);
}

function monthKeyUTC(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}${mm}`;
}

function nextMonthResetUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-based
  const firstNextMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  return firstNextMonth.toISOString();
}

async function getInt(redis: Redis, key: string): Promise<number> {
  const raw = await redis.get(key);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class UsageService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /**
   * Renvoie l’usage “courant” (minute actuelle + mois actuel) pour un tenant.
   * - rate limit: compteur minute `rl:{tenantId}:{minuteKey}`
   * - quota notif/mois: compteur `quota:notif:{tenantId}:{YYYYMM}`
   */
  async getTenantUsage(tenantId: string, tenantPlan: plan) {
    const planKey = tenantPlan ?? plan.FREE;

    const rateLimitPerMin =
      PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS]?.reqPerMin ??
      PLAN_LIMITS.FREE.reqPerMin;

    const monthlyNotifLimit =
      PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS]?.monthlyNotifQuota ??
      PLAN_LIMITS.FREE.monthlyNotifQuota;

    // --- Rate limit (minute)
    const rlKey = `rl:${tenantId}:${currentMinuteKey()}`;
    const rlUsed = await getInt(this.redis, rlKey);
    const rlRemaining = Math.max(0, rateLimitPerMin - rlUsed);
    const rlReset = resetInSeconds();

    // --- Monthly quota (notif/mois)
    const qKey = `quota:notif:${tenantId}:${monthKeyUTC()}`;
    const qUsed = await getInt(this.redis, qKey);
    const qRemaining = Math.max(0, monthlyNotifLimit - qUsed);

    return {
      tenantId,
      plan: planKey,
      rateLimit: {
        limitPerMin: rateLimitPerMin,
        used: rlUsed,
        remaining: rlRemaining,
        resetInSec: rlReset,
      },
      monthlyQuota: {
        limit: monthlyNotifLimit,
        used: qUsed,
        remaining: qRemaining,
        resetsAt: nextMonthResetUTC(),
      },
    };
  }
}
