import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Reminder, ReminderDocument } from './schemas/reminder.schema.js';
import { CreateReminderDto } from './dto/create-reminder.dto.js';
import { UpdateReminderDto } from './dto/update-reminder.dto.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS instead of SMTPS (port 465)
      requireTLS: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false // Helps bypass local firewall certificate rewrites
      }
    });
  }

  async create(createReminderDto: CreateReminderDto, userId: string): Promise<Reminder> {
    const now = new Date();

    // BUG-01 fix: Prevent reminder date in the past
    if (new Date(createReminderDto.reminderDate) <= now) {
      throw new BadRequestException('Reminder date must be in the future');
    }

    // BUG-01 fix: Prevent event date in the past
    if (new Date(createReminderDto.eventDate) <= now) {
      throw new BadRequestException('Event date must be in the future');
    }

    const createdReminder = new this.reminderModel({ ...createReminderDto, userId });
    return createdReminder.save();
  }

  async findAll(userId: string): Promise<Reminder[]> {
    return this.reminderModel.find({ userId }).sort({ reminderDate: 1 }).exec();
  }

  async update(id: string, updateReminderDto: UpdateReminderDto, userId: string): Promise<Reminder> {
    // BUG-06 fix: Validate ObjectId format
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid reminder ID format');

    const reminder = await this.reminderModel.findOne({ _id: id, userId }).exec();

    // BUG-06 fix: Return 404 when not found
    if (!reminder) throw new NotFoundException(`Reminder with ID ${id} not found`);

    // BUG-02 fix: Prevent re-arming a Sent/Processing reminder
    if (reminder.status === 'Sent' || reminder.status === 'Processing') {
      throw new BadRequestException(
        `Cannot edit a reminder with status '${reminder.status}'. Only 'Pending' or 'Failed' reminders can be updated.`,
      );
    }

    // If dates are being updated, validate they're in the future
    const now = new Date();
    if (updateReminderDto.reminderDate && new Date(updateReminderDto.reminderDate) <= now) {
      throw new BadRequestException('Reminder date must be in the future');
    }
    if (updateReminderDto.eventDate && new Date(updateReminderDto.eventDate) <= now) {
      throw new BadRequestException('Event date must be in the future');
    }

    // When editing a Failed reminder, reset it back to Pending so the cron picks it up again
    const updatePayload: Record<string, unknown> = { ...updateReminderDto };
    if (reminder.status === 'Failed') {
      updatePayload.status = 'Pending';
    }

    return this.reminderModel.findByIdAndUpdate(id, updatePayload, { new: true }).exec() as Promise<Reminder>;
  }

  async delete(id: string, userId: string): Promise<Reminder> {
    // BUG-06 fix: Validate ObjectId format
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid reminder ID format');

    const deleted = await this.reminderModel.findOneAndDelete({ _id: id, userId }).exec();

    // BUG-06 fix: Return 404 when not found
    if (!deleted) throw new NotFoundException(`Reminder with ID ${id} not found`);

    return deleted;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for reminders to send...');
    const now = new Date();

    // Atomically fetch Pending reminders and mark as Processing to prevent race conditions (BUG-04 was already fixed)
    const pendingReminders = await this.reminderModel.find({
      status: 'Pending',
      reminderDate: { $lte: now },
    });

    if (pendingReminders.length === 0) return;

    const ids = pendingReminders.map((r) => r._id);
    await this.reminderModel.updateMany({ _id: { $in: ids } }, { $set: { status: 'Processing' } });

    for (const reminder of pendingReminders) {
      try {
        await this.transporter.sendMail({
          from: `"Remind App" <${this.configService.get<string>('EMAIL_USER')}>`,
          to: reminder.email,
          subject: `Reminder: ${reminder.title}`,
          text: `This is a reminder for your event "${reminder.title}" scheduled on ${new Date(reminder.eventDate).toLocaleString()}.${reminder.description ? `\n\nDescription: ${reminder.description}` : ''}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #4f46e5; margin-top: 0;">📅 Event Reminder</h2>
              <p style="color: #334155;">This is a reminder for your upcoming event:</p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>Event:</strong> ${reminder.title}</p>
                <p style="margin: 0;"><strong>Scheduled:</strong> ${new Date(reminder.eventDate).toLocaleString()}</p>
                ${reminder.description ? `<p style="margin: 8px 0 0; padding-top: 8px; border-top: 1px solid #cbd5e1; white-space: pre-wrap;"><strong>Description:</strong><br/>${reminder.description}</p>` : ''}
              </div>
              <p style="color: #64748b; font-size: 14px;">This reminder was sent by the Remind App.</p>
            </div>
          `,
        });

        await this.reminderModel.findByIdAndUpdate(reminder._id, { status: 'Sent' });
        this.logger.log(`Sent reminder email to ${reminder.email} for event "${reminder.title}"`);
      } catch (error: any) {
        await this.reminderModel.findByIdAndUpdate(reminder._id, { status: 'Failed' });
        this.logger.error(`Failed to send email to ${reminder.email}: ${error.message}`);
      }
    }
  }
}
