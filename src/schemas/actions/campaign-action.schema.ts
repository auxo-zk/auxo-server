import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Utilities } from 'src/mina-contracts/utilities';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { UInt64 } from 'o1js';

export class Timeline {
    startParticipation: number;
    startFunding: number;
    startRequesting: number;

    constructor(
        startParticipation: number,
        startFunding: number,
        startRequesting: number,
    ) {
        this.startParticipation = startParticipation;
        this.startFunding = startFunding;
        this.startRequesting = startRequesting;
    }

    static fromAction(action: Storage.CampaignStorage.Timeline): Timeline {
        return new Timeline(
            Number(action.startParticipation.toBigInt()),
            Number(action.startFunding.toBigInt()),
            Number(action.startRequesting.toBigInt()),
        );
    }

    toAction() {
        return new Storage.CampaignStorage.Timeline({
            startParticipation: new UInt64(this.startParticipation),
            startFunding: new UInt64(this.startFunding),
            startRequesting: new UInt64(this.startRequesting),
        });
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

    @Prop({ index: true })
    actionHash: string;

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
