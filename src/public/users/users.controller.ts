// public/users/users.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  Delete,
  Param,
  Patch,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { UsersService } from './users.service';
import * as requestWithTenant from 'src/common/types/request-with-tenant';
import { PublicApi } from 'src/common/decorators/api.decorator';

@ApiTags('Users')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant API key',
  required: true,
})
@PublicApi()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crée un utilisateur pour le tenant courant',
  })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 409, description: 'Utilisateur déjà existant' })
  @ApiResponse({ status: 400, description: 'Mauvaise requête' })
  async create(
    @Body() dto: CreateUserDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const tenant = req.tenant;
    return this.usersService.createUser(dto, tenant.id);
  }

  // 🔹 Modifier l'externalId d'un user
  @Patch(':externalId')
  @ApiOperation({
    summary: "Modifie l'externalId d'un utilisateur",
  })
  @ApiResponse({ status: 201, description: 'Utilisateur mis à jour' })
  @ApiResponse({ status: 409, description: 'Utilisateur déjà existant' })
  @ApiResponse({ status: 400, description: 'Mauvaise requête' })
  async setNewExternalId(
    @Param('externalId') externalId: string,
    @Body('newExternalId') newExternalId: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    if (!newExternalId) {
      throw new BadRequestException('newExternalId is required');
    }

    const tenantId = req.tenant.id;

    const updatedUser = await this.usersService.setNewExternalId(
      externalId,
      tenantId,
      newExternalId,
    );

    return {
      success: true,
      externalId: externalId,
      newExternalId: updatedUser.external_id,
    };
  }

  // 🔹 Suppression définitive (hard delete) ou désactivation d'un user
  @Delete(':externalId')
  @ApiOperation({
    summary: 'Supprime ou désactive un utilisateur pour le tenant courant',
  })
  @ApiResponse({ status: 201, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 409, description: 'Utilisateur déjà supprimé' })
  @ApiResponse({ status: 400, description: 'Mauvaise requête' })
  async deleteUser(
    @Param('externalId') externalId: string,
    @Query('force') force: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const tenant = req.tenant;
    const isForceDelete = force === 'true';

    if (isForceDelete) {
      const deleted = await this.usersService.hardDeleteUser(
        externalId,
        tenant.id,
      );
      if (!deleted) throw new NotFoundException('User not found');

      return { success: true, deleted: true };
    }

    // Sinon, soft delete
    const softDeleted = await this.usersService.setActiveState(
      externalId,
      tenant.id,
      false,
    );
    if (!softDeleted) throw new NotFoundException('User not found');

    return { success: true, deleted: false };
  }

  @Patch(':externalId/reactivate')
  @ApiOperation({ summary: 'Réactiver un utilisateur désactivé' })
  @ApiResponse({ status: 200, description: 'Utilisateur réactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async reactivateUser(
    @Param('externalId') externalId: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const tenantId = req.tenant.id;

    const result = await this.usersService.setActiveState(
      externalId,
      tenantId,
      true,
    );

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      reactivated: true,
    };
  }
}
