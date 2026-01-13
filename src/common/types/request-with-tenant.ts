import { Request } from 'express';
import { tenant } from '@prisma/client';

export interface RequestWithTenant extends Request {
  tenant: tenant;
}
