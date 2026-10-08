import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReminderDocument = HydratedDocument<Reminder>;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  eventDate: Date;

  @Prop({ required: true })
  reminderDate: Date;

  @Prop({ default: 'Pending', enum: ['Pending', 'Processing', 'Sent', 'Failed'] })
  status: 'Pending' | 'Processing' | 'Sent' | 'Failed';
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
