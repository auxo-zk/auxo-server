import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, ObjectId } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { ZkApp } from '@auxo-dev/platform';
import { Participation } from '../participation.schema';

export class ParticipationActionData {
    campaignId: number;
    projectId: number;
    ipfsHash: string;
    timestamp: number;

    static fromAction(
        action: ZkApp.Participation.ParticipationAction,
    ): ParticipationActionData {
        return {
            campaignId: Number(action.campaignId.toBigInt()),
            projectId: Number(action.projectId.toBigInt()),
            ipfsHash: action.ipfsHash.toString(),
            timestamp: Number(action.timestamp.toBigInt()),
        };
    }
}
@Schema({ versionKey: false })
export class ParticipationAction {
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

    @Prop({ type: ParticipationActionData })
    actionData: ParticipationActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type ParticipationActionDocument = HydratedDocument<ParticipationAction>;
export const ParticipationActionSchema =
    SchemaFactory.createForClass(ParticipationAction);

export function getParticipationActionData(
    actions: string[],
): ParticipationActionData {
    const action = ZkApp.Participation.ParticipationAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return ParticipationActionData.fromAction(action);
}
