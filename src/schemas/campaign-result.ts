import { Storage } from '@auxo-dev/platform';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class CampaignResult {
    @Prop({ required: true, unique: true, index: true })
    campaignId: number;

    @Prop()
    result?: number[];

    @Prop({
        index: true,
        default: Storage.TreasuryManagerStorage.CampaignStateEnum.NOT_ENDED,
    })
    state?: Storage.TreasuryManagerStorage.CampaignStateEnum;
}

export type CampaignResultDocument = HydratedDocument<CampaignResult>;
export const CampaignResultSchema =
    SchemaFactory.createForClass(CampaignResult);
