import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto, adminUserId: string) {
    const { email, plan, issueApiKey } = dto;

    // Vérifie si le nom est vide ou déjà pris
    if (!email.trim())
      throw new BadRequestException('Tenant email cannot be empty');
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email },
    });
    if (existingTenant) throw new BadRequestException('Tenant already exists');

    // Création du tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        email,
        plan,
        created_at: new Date(),
      },
    });

    // Génération optionnelle d’une clé API
    let apiKey: string | null = null;
    if (issueApiKey) {
      apiKey = `key_${randomBytes(24).toString('hex')}`;
      await this.prisma.api_key.create({
        data: {
          key: apiKey,
          tenant_id: tenant.id,
          created_at: new Date(),
        },
      });
    }

    // Journalisation (simple pour MVP)
    console.log('Audit: TENANT_CREATE', { adminUserId, tenantId: tenant.id });

    return { tenant, apiKey };
  }
}
