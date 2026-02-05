import { IsISO8601 } from 'class-validator';

export class RescheduleNotificationDto {
  @IsISO8601()
  sendAt!: string;
}
