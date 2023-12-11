import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Round1 } from '../round-1.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina/utilities';

@Schema({ versionKey: false })
export class Round1Action {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type Round1ActionDocument = HydratedDocument<Round1Action>;
export const Round1ActionSchema = SchemaFactory.createForClass(Round1Action);

export function getRound1(round1Action: Round1Action): Round1 {
    const data = round1Action.actions;
    const contribution: { x: string; y: string }[] = [];
    const action = ZkApp.Round1.Action.fromFields(
        Utilities.stringArrayToFields(round1Action.actions),
    );
    for (let i = 0; i < action.contribution.C.length.toBigInt(); i++) {
        const point = action.contribution.C.values[i];
        contribution.push({ x: point.x.toString(), y: point.y.toString() });
    }
    const round1: Round1 = {
        actionId: round1Action.actionId,
        committeeId: Number(action.committeeId.toString()),
        keyId: Number(action.keyId.toString()),
        memberId: Number(action.memberId.toString()),
        contribution: contribution,
    };
    return round1;
}
