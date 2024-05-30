import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';

export class Round1ActionData {
    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    memberId: number;

    @Prop({ type: [{ x: String, y: String }] })
    contribution: { x: string; y: string }[];

    constructor(
        committeeId: number,
        keyId: number,
        memberId: number,
        contribution: { x: string; y: string }[],
    ) {
        this.committeeId = committeeId;
        this.keyId = keyId;
        this.memberId = memberId;
        this.contribution = contribution;
    }

    static fromAction(action: ZkApp.Round1.Round1Action): Round1ActionData {
        const contribution: { x: string; y: string }[] = [];
        for (let i = 0; i < action.contribution.C.length.toBigInt(); i++) {
            const point = action.contribution.C.values[i];
            contribution.push({ x: point.x.toString(), y: point.y.toString() });
        }
        return new Round1ActionData(
            Number(action.committeeId.toBigInt()),
            Number(action.keyId.toBigInt()),
            Number(action.memberId.toBigInt()),
            contribution,
        );
    }
}
@Schema({ versionKey: false })
export class Round1Action {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop({ type: Round1ActionData })
    actionData: Round1ActionData;

    @Prop()
    actions: string[];

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type Round1ActionDocument = HydratedDocument<Round1Action>;
export const Round1ActionSchema = SchemaFactory.createForClass(Round1Action);

export function getRound1ActionData(actions: string[]): Round1ActionData {
    const action = ZkApp.Round1.Round1Action.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return Round1ActionData.fromAction(action);
}
