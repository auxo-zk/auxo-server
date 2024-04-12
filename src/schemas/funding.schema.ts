import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Funding {
    @Prop({ index: true, required: true, unique: true })
    fundingId: number;

    @Prop({ index: true })
    campaignId: number;

    @Prop({ index: true })
    investor: string;

    @Prop()
    amount: number;

    @Prop()
    state: number;
}

export type FundingDocument = HydratedDocument<Funding>;
export const FundingSchema = SchemaFactory.createForClass(Funding);
