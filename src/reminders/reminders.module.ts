import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemindersController } from './reminders.controller.js';
import { RemindersService } from './reminders.service.js';
import { Reminder, ReminderSchema } from './schemas/reminder.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reminder.name, schema: ReminderSchema }])
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
