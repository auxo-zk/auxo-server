import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Timeline } from './actions/campaign-action.schema';
import { Storage } from '@auxo-dev/platform';

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

    @Prop({ required: true, default: 0 })
    projectCounter?: number;

    @Prop()
    result?: number[];

    @Prop({
        index: true,
        default: Storage.TreasuryManagerStorage.CampaignStateEnum.NOT_ENDED,
    })
    state?: Storage.TreasuryManagerStorage.CampaignStateEnum;
}

export type CampaignDocument = HydratedDocument<Campaign>;
export const CampaignSchema = SchemaFactory.createForClass(Campaign);
