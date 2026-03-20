import { Test } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  const prismaMock = {
    api_key: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(ApiKeysService);
    jest.clearAllMocks();
  });

  it('validateApiKey should return null when key not found', async () => {
    prismaMock.api_key.findUnique = jest.fn().mockResolvedValue(null);

    const result = await service.validateApiKey('key_test');
    expect(result).toBeNull();
  });

  it('validateApiKey should return null when key is inactive', async () => {
    prismaMock.api_key.findUnique = jest.fn().mockResolvedValue({
      is_active: false,
      tenant: { id: 't1' },
    });

    const result = await service.validateApiKey('key_test');
    expect(result).toBeNull();
  });

  it('validateApiKey should return tenant when key is active', async () => {
    prismaMock.api_key.findUnique = jest.fn().mockResolvedValue({
      is_active: true,
      tenant: { id: 't1', email: 'a@b.com' },
    });

    const result = await service.validateApiKey('key_test');
    expect(result).toEqual({ id: 't1', email: 'a@b.com' });
  });
});
