import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CampaignStatusEnum } from 'src/constants';

@Schema({ versionKey: false })
export class Campaign {
    @Prop({ required: true, unique: true, index: true })
    campaignId: number;

    @Prop()
    ipfsHash: string;

    @Prop()
    owner: string;

    @Prop()
    status: CampaignStatusEnum;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop({ type: Object })
    ipfsData: object;

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type CampaignDocument = HydratedDocument<Campaign>;
export const CampaignSchema = SchemaFactory.createForClass(Campaign);
