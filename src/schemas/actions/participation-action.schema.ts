import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, ObjectId } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { ZkApp } from '@auxo-dev/platform';
import { Participation } from '../participation.schema';

@Schema({ versionKey: false })
export class ParticipationAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type ParticipationActionDocument = HydratedDocument<ParticipationAction>;
export const ParticipationActionSchema =
    SchemaFactory.createForClass(ParticipationAction);

export function getParticipation(
    participationAction: ParticipationAction,
): Participation {
    const action = ZkApp.Participation.ParticipationAction.fromFields(
        Utilities.stringArrayToFields(participationAction.actions),
    );
    const campaignId = Number(action.campaignId.toString());
    const projectId = Number(action.projectId.toString());

    return {
        actionId: participationAction.actionId,
        campaignId: campaignId,
        projectId: projectId,
        ipfsHash: action.participationInfo.toString(),
        currentApplicationInfoHash: action.curApplicationInfoHash.toString(),
    };
}
