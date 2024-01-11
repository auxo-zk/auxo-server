import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Funding {
    @Prop({ index: true, required: true, unique: true })
    actionId: number;

    @Prop({ index: true, required: true })
    campaignId: number;

    @Prop()
    R: { x: string; y: string }[];

    @Prop()
    M: { x: string; y: string }[];

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type FundingDocument = HydratedDocument<Funding>;
export const FundingSchema = SchemaFactory.createForClass(Funding);
