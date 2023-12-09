import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Round2 } from '../round-2.schema';

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
    const data = round2Action.actions;
    const committeeId = Number(Field.from(data[0]).toString());
    const keyId = Number(Field.from(data[1]).toString());
    const memberId = Number(Field.from(data[2]).toString());
    const contribution = {
        c: '',
        u: {
            x: '',
            y: '',
        },
    };
    const round2: Round2 = {
        actionId: round2Action.actionId,
        committeeId: committeeId,
        keyId: keyId,
        memberId: memberId,
        contribution: contribution,
    };
    return round2;
}
