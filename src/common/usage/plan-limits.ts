export type Plan = 'FREE' | 'PRO' | 'ULTRA';

export const PLAN_LIMITS: Record<
  Plan,
  { reqPerMin: number; monthlyNotifQuota: number }
> = {
  FREE: { reqPerMin: 60, monthlyNotifQuota: 1_000 },
  PRO: { reqPerMin: 120, monthlyNotifQuota: 50_000 },
  ULTRA: { reqPerMin: 300, monthlyNotifQuota: 500_000 },
};
