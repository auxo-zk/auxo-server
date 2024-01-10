import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CampaignStatusEnum, CampaignActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class RawCampaign {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    campaignId?: number;

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

    @Prop()
    actionEnum: CampaignActionEnum;
}

export type RawCampaignDocument = HydratedDocument<RawCampaign>;
export const RawCampaignSchema = SchemaFactory.createForClass(RawCampaign);
