import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable } from 'o1js';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { CustomScalar } from '@auxo-dev/auxo-libs';
import { Round2Contribution } from '../key.schema';

export class Round2ActionData {
    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    memberId: number;

    @Prop({ type: Round2Contribution })
    contribution: Round2Contribution;

    constructor(
        committeeId: number,
        keyId: number,
        memberId: number,
        contribution: Round2Contribution,
    ) {
        this.committeeId = committeeId;
        this.keyId = keyId;
        this.memberId = memberId;
        this.contribution = contribution;
    }

    static fromAction(action: ZkApp.Round2.Round2Action): Round2ActionData {
        const contribution: Round2Contribution = {
            c: [],
            u: [],
        };

        for (let i = 0; i < action.contribution.c.length.toBigInt(); i++) {
            const value = action.contribution.c.values[i];
            contribution.c.push(value.toBigInt().toString());
        }

        for (let i = 0; i < action.contribution.U.length.toBigInt(); i++) {
            const point = action.contribution.U.values[i];
            contribution.u.push({
                x: point.x.toBigInt().toString(),
                y: point.y.toBigInt().toString(),
            });
        }
        const unpackedId = ZkApp.Round2.Round2Action.unpackId(action.packedId);
        return new Round2ActionData(
            Number(unpackedId.committeeId.toBigInt()),
            Number(unpackedId.keyId.toBigInt()),
            Number(unpackedId.memberId.toBigInt()),
            contribution,
        );
    }
}
@Schema({ versionKey: false })
export class Round2Action {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop({ type: Round2ActionData })
    actionData: Round2ActionData;

    @Prop()
    actions: string[];

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type Round2ActionDocument = HydratedDocument<Round2Action>;
export const Round2ActionSchema = SchemaFactory.createForClass(Round2Action);

export function getRound2ActionData(actions: string[]): Round2ActionData {
    const action = ZkApp.Round2.Round2Action.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return Round2ActionData.fromAction(action);
}
