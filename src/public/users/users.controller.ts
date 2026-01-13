import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Delete,
  Param,
  Patch,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { ApiKeyAuthGuard } from 'src/common/guards/api-key-auth.guard';
import * as requestWithTenant from 'src/common/types/request-with-tenant';

@Controller('users')
@UseGuards(ApiKeyAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const tenant = req.tenant;
    return this.usersService.createUser(dto, tenant.id);
  }

  // 🔹 Soft delete ou réactivation (désactiver / activer un user)
  @Patch(':externalId/active')
  async setActiveState(
    @Param('externalId') externalId: string,
    @Body('isActive') isActive: boolean,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive (boolean) is required');
    }

    const tenant = req.tenant;
    const result = await this.usersService.setActiveState(
      externalId,
      tenant.id,
      isActive,
    );

    if (!result) throw new NotFoundException('User not found');

    return {
      success: true,
      externalId,
      isActive,
    };
  }

  // 🔹 Suppression définitive (hard delete)
  @Delete(':externalId')
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
}
