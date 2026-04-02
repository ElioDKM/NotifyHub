import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

describe('UsersService.setNewExternalId', () => {
  let service: UsersService;

  const prismaMock = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const queueMock = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: getQueueToken('notifications'), useValue: queueMock }, // ✅ important
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  it('should throw NotFoundException when user does not exist', async () => {
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValueOnce(null),
      },
    };

    prismaMock.$transaction = jest.fn((cb: any) => cb(tx));

    await expect(
      service.setNewExternalId('old', 'tenant1', 'new'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw ConflictException when newExternalId already exists', async () => {
    const tx = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'u1' }) // existing user
          .mockResolvedValueOnce({ id: 'u2' }), // duplicate
        update: jest.fn(),
      },
    };

    prismaMock.$transaction = jest.fn((cb: any) => cb(tx));

    await expect(
      service.setNewExternalId('old', 'tenant1', 'new'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should update and return updated user when ok', async () => {
    const tx = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'u1' })
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({ id: 'u1', external_id: 'new' }),
      },
    };

    prismaMock.$transaction = jest.fn((cb: any) => cb(tx));

    const result = await service.setNewExternalId('old', 'tenant1', 'new');
    expect(result).toEqual({ id: 'u1', external_id: 'new' });
    expect(tx.user.update).toHaveBeenCalled();
  });
});
