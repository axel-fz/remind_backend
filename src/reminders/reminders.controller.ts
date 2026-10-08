import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { RemindersService } from './reminders.service.js';
import { CreateReminderDto } from './dto/create-reminder.dto.js';
import { UpdateReminderDto } from './dto/update-reminder.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('reminders')
@UseGuards(AuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Body() createReminderDto: CreateReminderDto, @Request() req: any) {
    return this.remindersService.create(createReminderDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.remindersService.findAll(req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReminderDto: UpdateReminderDto, @Request() req: any) {
    return this.remindersService.update(id, updateReminderDto, req.user.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.remindersService.delete(id, req.user.sub);
  }
}
