import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable } from 'o1js';
import { Round2 } from '../round-2.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina/utilities';
import { CustomScalar } from '@auxo-dev/auxo-libs';

@Schema({ versionKey: false })
export class Round2Action {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type Round2ActionDocument = HydratedDocument<Round2Action>;
export const Round2ActionSchema = SchemaFactory.createForClass(Round2Action);

// let action = new Action({
//     committeeId: committeeId,
//     keyId: keyId,
//     memberId: memberId,
//     contribution: new Round2Contribution({
//       c: proof.publicInput.c,
//       U: proof.publicInput.U,
//     }),
//   });

export function getRound2(round2Action: Round2Action): Round2 {
    const contribution: { c: string[]; u: { x: string; y: string }[] } = {
        c: [],
        u: [],
    };
    const action = ZkApp.Round2.Action.fromFields(
        Utilities.stringArrayToFields(round2Action.actions),
    );
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
    const round2: Round2 = {
        actionId: round2Action.actionId,
        committeeId: Number(action.committeeId.toString()),
        keyId: Number(action.keyId.toString()),
        memberId: Number(action.memberId.toString()),
        contribution: contribution,
    };
    return round2;
}
