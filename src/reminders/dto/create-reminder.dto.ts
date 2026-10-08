import { IsString, IsEmail, IsNotEmpty, IsDateString, Matches, MinDate, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty or whitespace' })
  @Matches(/\S/, { message: 'Title cannot be whitespace only' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsDateString({}, { message: 'Event date must be a valid ISO date string' })
  @IsNotEmpty()
  eventDate: string;

  @IsDateString({}, { message: 'Reminder date must be a valid ISO date string' })
  @IsNotEmpty()
  reminderDate: string;
}
