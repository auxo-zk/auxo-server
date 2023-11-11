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
    @Prop({ required: true, unique: true })
    committeeActionId: string;

    @Prop()
    actionEnum: ActionEnum;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    requestId: number;

    @Prop({ type: Array<Point> })
    round1Contribution: Point[];

    @Prop({ type: Object })
    round2Contribution: { c: string; u: Point };

    @Prop({ type: Array<Point> })
    responseContribution: Point[];

    @Prop()
    blockHeight: number;
}

export class Point {
    @Prop()
    x: string;

    @Prop()
    y: string;

    constructor(x: string, y: string) {
        this.x = x;
        this.y = y;
    }
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);
