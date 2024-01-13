import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Treasury {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    campaignId: number;

    @Prop({ index: true })
    projectId: number;

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type TreasuryDocument = HydratedDocument<Treasury>;
export const TreasurySchema = SchemaFactory.createForClass(Treasury);
