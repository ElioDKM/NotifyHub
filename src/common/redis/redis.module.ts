import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const host = process.env.REDIS_HOST ?? '127.0.0.1';
        const port = Number(process.env.REDIS_PORT ?? 6379);
        return new Redis({ host, port });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
