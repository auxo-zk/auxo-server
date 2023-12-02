import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Round1Contribution } from '../round-1-contribution.schema';

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

export function getRound1Contribution(
    round1Action: Round1Action,
): Round1Contribution {
    const data = round1Action.actions;
    const committeeId = Number(Field.from(data[0]).toString());
    const keyId = Number(Field.from(data[1]).toString());
    const memberId = Number(Field.from(data[2]).toString());
    const contributionLength = Number(Field.from(data[3]).toString());
    const contribution: { x: string; y: string }[] = [];
    for (let i = 0; i < contributionLength; i++) {
        const x = Field.from(data[4 + i * 2]).toString();
        const y = Field.from(data[4 + i * 2 + 1]).toString();
        contribution.push({ x: x, y: y });
    }
    const round1: Round1Contribution = {
        actionId: round1Action.actionId,
        committeeId: committeeId,
        keyId: keyId,
        memberId: memberId,
        contribution: contribution,
    };
    return round1;
}
