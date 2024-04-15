import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Timeline } from './actions/campaign-action.schema';
@Schema({ versionKey: false })
export class Campaign {
    @Prop({ required: true, unique: true, index: true })
    campaignId: number;

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData: object;

    @Prop()
    owner: string;

    @Prop({ type: Timeline })
    timeline: Timeline;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type CampaignDocument = HydratedDocument<Campaign>;
export const CampaignSchema = SchemaFactory.createForClass(Campaign);
