import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Utilities } from 'src/mina-contracts/utilities';
import { Storage, ZkApp } from '@auxo-dev/platform';

export class Timeline {
    startParticipation: number;
    startFunding: number;
    startRequesting: number;

    static fromAction(action: Storage.CampaignStorage.Timeline): Timeline {
        return {
            startParticipation: Number(action.startParticipation.toBigInt()),
            startFunding: Number(action.startFunding.toBigInt()),
            startRequesting: Number(action.startRequesting.toBigInt()),
        };
    }
}

export class CampaignActionData {
    campaignId: number;
    ipfsHash: string;
    owner: string;
    timeline: Timeline;
    committeeId: number;
    keyId: number;

    static fromAction(
        action: ZkApp.Campaign.CampaignAction,
    ): CampaignActionData {
        return {
            campaignId: Number(action.campaignId.toBigInt()),
            ipfsHash: action.ipfsHash.toString(),
            owner: action.owner.toBase58(),
            timeline: Timeline.fromAction(action.timeline),
            committeeId: Number(action.committeeId.toBigInt()),
            keyId: Number(action.keyId.toBigInt()),
        };
    }
}
@Schema({ versionKey: false })
export class CampaignAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop([String])
    actions: string[];

    @Prop({ type: CampaignActionData })
    actionData?: CampaignActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type CampaignActionDocument = HydratedDocument<CampaignAction>;
export const CampaignActionSchema =
    SchemaFactory.createForClass(CampaignAction);

export function getCampaignActionData(actions: string[]): CampaignActionData {
    const action = ZkApp.Campaign.CampaignAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return CampaignActionData.fromAction(action);
}
