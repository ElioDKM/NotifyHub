import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { UsageGuard } from '../guards/usage.guard';

export function PublicApi() {
  return applyDecorators(UseGuards(ApiKeyAuthGuard, UsageGuard));
}
