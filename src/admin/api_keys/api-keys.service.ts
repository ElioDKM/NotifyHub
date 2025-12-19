import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère et stocke une API key sécurisée pour un tenant donné.
   * @param tenantEmail L'email du tenant
   * @returns la clé API en clair (affichée une seule fois)
   */
  async generateForTenant(tenantEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: tenantEmail },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const rawKey = `key_${randomBytes(32).toString('hex')}`;

    const hashedKey = createHash('sha256').update(rawKey).digest('hex');

    const newKey = await this.prisma.api_key.create({
      data: {
        key: hashedKey,
        tenant_id: tenant.id,
        is_active: true,
        created_at: new Date(),
      },
      select: { id: true, is_active: true, created_at: true },
    });

    return {
      ...newKey,
      key: rawKey,
    };
  }

  /**
   * Vérifie une clé API reçue (depuis un header) et renvoie le tenant associé
   */
  async validateApiKey(providedKey: string) {
    const hashed = createHash('sha256').update(providedKey).digest('hex');

    const keyRecord = await this.prisma.api_key.findUnique({
      where: { key: hashed },
      include: { tenant: true },
    });

    if (!keyRecord || !keyRecord.is_active) return null;
    return keyRecord.tenant;
  }

  /**
   * Désactive une clé API (sans la supprimer)
   */
  async updateKeyStatusByMode(
    tenantEmail: string,
    keyIdOrMode: string,
    isActive: boolean,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: tenantEmail },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const action = isActive ? 'activated' : 'deactivated';

    // 🔸 Désactive ou réactive TOUTES les clés
    if (keyIdOrMode === 'all') {
      const result = await this.prisma.api_key.updateMany({
        where: { tenant_id: tenant.id, is_active: !isActive },
        data: { is_active: isActive },
      });

      return {
        message: `All API keys (${result.count}) ${action} successfully.`,
      };
    }

    // 🔸 Latest ou oldest
    if (['latest', 'oldest'].includes(keyIdOrMode)) {
      const order = keyIdOrMode === 'latest' ? 'desc' : 'asc';
      const key = await this.prisma.api_key.findFirst({
        where: { tenant_id: tenant.id, is_active: !isActive },
        orderBy: { created_at: order },
      });

      if (!key)
        throw new NotFoundException(
          `No ${!isActive ? 'inactive' : 'active'} keys found`,
        );

      await this.prisma.api_key.update({
        where: { id: key.id },
        data: { is_active: isActive },
      });

      return { message: `API key ${action} successfully`, keyId: key.id };
    }

    // 🔸 Cas spécifique : un ID
    const specificKey = await this.prisma.api_key.findUnique({
      where: { id: keyIdOrMode },
    });

    if (!specificKey || specificKey.tenant_id !== tenant.id) {
      throw new NotFoundException('API key not found for this tenant');
    }

    await this.prisma.api_key.update({
      where: { id: keyIdOrMode },
      data: { is_active: isActive },
    });

    return { message: `API key ${action} successfully`, keyId: keyIdOrMode };
  }

  /**
   * Liste toutes les clés d’un tenant
   */
  async listTenantKeys(tenantEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: tenantEmail },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.api_key.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        created_at: true,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
