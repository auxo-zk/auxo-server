import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class FundingResult {
    @Prop({ index: true, required: true, unique: true })
    campaignId: number;

    @Prop()
    sumR: { x: string; y: string }[];

    @Prop()
    sumM: { x: string; y: string }[];

    @Prop()
    requestId: string;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    result?: string[];
}

export type FundingResultDocument = HydratedDocument<FundingResult>;
export const FundingResultSchema = SchemaFactory.createForClass(FundingResult);
