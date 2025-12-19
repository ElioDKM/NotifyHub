import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ApiKeysService } from '../api_keys/api-keys.service';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantEmailDto } from './dto/update-tenant-email.dto';
import { UpdateTenantSuspensionDto } from './dto/update-tenant-suspension.dto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  // Création d’un tenant
  async createTenant(dto: CreateTenantDto, adminUserId: string) {
    const { email, plan, issueApiKey } = dto;

    if (!email.trim())
      throw new BadRequestException('Tenant email cannot be empty');
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email },
    });
    if (existingTenant) throw new BadRequestException('Tenant already exists');

    const tenant = await this.prisma.tenant.create({
      data: {
        email,
        plan,
        created_at: new Date(),
      },
    });

    let apiKey: { key: string; id?: string; created_at?: Date } | null = null;
    if (issueApiKey) {
      apiKey = await this.apiKeysService.generateForTenant(dto.email);
      console.log('Clé générée :', apiKey.key); // visible une seule fois
    }

    console.log('Audit: TENANT_CREATE', { adminUserId, tenantId: tenant.id });

    return { tenant, apiKey };
  }

  // Liste les tenants avec filtres et pagination
  async listTenants(query: GetTenantsQueryDto) {
    const { plan, q, page = 1, pageSize = 10 } = query;

    const where: Prisma.tenantWhereInput = {};
    if (plan) where.plan = plan;
    if (q) where.email = { contains: q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // Récupère un tenant par ID ou email
  async getTenant(where: Prisma.tenantWhereUniqueInput) {
    const tenant = await this.prisma.tenant.findUnique({ where });
    if (!tenant) {
      throw new NotFoundException('TenantNotFound');
    }
    return tenant;
  }

  // Change le plan d’un tenant
  async updateTenantPlan(email: string, dto: UpdateTenantPlanDto) {
    const tenant = await this.getTenant({ email });
    if (tenant.plan === dto.plan) {
      throw new ConflictException('Plan unchanged');
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { email },
      data: { plan: dto.plan },
    });

    console.log(
      `TENANT_PLAN_CHANGE: { from: ${tenant.plan}, to: ${dto.plan} }`,
    );

    return updatedTenant;
  }

  // Met à jour l’email d’un tenant
  async updateTenantEmail(email: string, dto: UpdateTenantEmailDto) {
    const tenant = await this.getTenant({ email });
    if (tenant.email === dto.newEmail) {
      throw new ConflictException('Email unchanged');
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { email: dto.newEmail },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { email },
      data: { email: dto.newEmail },
    });

    console.log(
      `TENANT_EMAIL_CHANGE: { from: ${tenant.email}, to: ${dto.newEmail} }`,
    );

    return updatedTenant;
  }

  // Suspend ou réactive un tenant
  async updateTenantSuspension(email: string, dto: UpdateTenantSuspensionDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updatedTenant = await this.prisma.tenant.update({
      where: { email },
      data: { is_suspended: dto.isSuspended },
    });

    if (dto.isSuspended) {
      const disabledKeys = await this.prisma.api_key.updateMany({
        where: { tenant_id: tenant.id, is_active: true },
        data: { is_active: false },
      });
      console.log(
        `🔒 ${disabledKeys.count} clés API désactivées pour ${tenant.email}`,
      );
    }

    return {
      message: dto.isSuspended
        ? 'Tenant suspended and API keys deactivated'
        : 'Tenant reactivated (API keys remain inactive)',
      tenant: {
        email: updatedTenant.email,
        isSuspended: updatedTenant.is_suspended,
        plan: updatedTenant.plan,
      },
    };
  }
}
