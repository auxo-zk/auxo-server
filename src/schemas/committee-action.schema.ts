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
    @Prop({ required: true, index: true, unique: true })
    committeeActionId: string;

    @Prop()
    actionEnum: ActionEnum;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    requestId: number;

    @Prop({ type: Object })
    data: object;

    @Prop()
    blockHeight: number;
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);
