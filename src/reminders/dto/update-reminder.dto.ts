import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class UpdateReminderDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @IsDateString()
  @IsOptional()
  reminderDate?: string;
}
