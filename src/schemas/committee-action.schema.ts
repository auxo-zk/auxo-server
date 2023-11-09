import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export const enum ActionEnum {
    GENERATE_KEY,
    DEPRECATE_KEY,
    CONTRIBUTE_ROUND_1,
    CONTRIBUTE_ROUND_2,
    CONTRIBUTE_RESPONSE,
    __LENGTH,
}

@Schema()
export class CommitteeAction {
    @Prop()
    actionEnum: ActionEnum;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    requestId: number;

    @Prop()
    round1Contribution: [{ x: string; y: string }];

    @Prop()
    round2Contribution: { c: string; u: { x: string; y: string } };

    @Prop()
    responseContribution: [{ x: string; y: string }];

    @Prop()
    blockHeight: number;
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);

// export class Point {
//     x: string;
//     y: string;
// }

// export class Round2Contribution {
//     c: string;
//     u: Point;
// }
