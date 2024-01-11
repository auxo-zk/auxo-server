import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Committee } from '../committee.schema';
import { Utilities } from 'src/mina-contracts/utilities';
import { RawCampaign } from '../raw-campaign.schema';
import { ZkApp } from '@auxo-dev/platform';
import { CampaignActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class CampaignAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type CampaignActionDocument = HydratedDocument<CampaignAction>;
export const CampaignActionSchema =
    SchemaFactory.createForClass(CampaignAction);

export function getRawCampaign(campaignAction: CampaignAction): RawCampaign {
    const action = ZkApp.Campaign.CampaignAction.fromFields(
        Utilities.stringArrayToFields(campaignAction.actions),
    );
    if (action.campaignId.equals(Field(-1))) {
        return {
            actionId: campaignAction.actionId,
            ipfsHash: action.ipfsHash.toString(),
            owner: action.owner.toBase58(),
            status: Number(action.campaignStatus.toString()),
            committeeId: Number(action.committeeId.toString()),
            keyId: Number(action.keyId.toString()),
            actionEnum: CampaignActionEnum.CREATE_CAMPAIGN,
        };
    } else {
        return {
            actionId: campaignAction.actionId,
            campaignId: Number(action.campaignId.toString()),
            ipfsHash: action.ipfsHash.toString(),
            owner: action.owner.toBase58(),
            status: Number(action.campaignStatus.toString()),
            committeeId: Number(action.committeeId.toString()),
            keyId: Number(action.keyId.toString()),
            actionEnum: CampaignActionEnum.CREATE_CAMPAIGN,
        };
    }
}
