import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const enum DkgEventEnum {
    KEY_UPDATES_REDUCED,
    __LENGTH,
}

export const enum DkgActionEnum {
    GENERATE_KEY,
    FINALIZE_ROUND_1,
    FINALIZE_ROUND_2,
    DEPRECATE_KEY,
    __LENGTH,
}

@Schema({ versionKey: false })
export class DkgAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type DKGActionDocument = HydratedDocument<DkgAction>;
export const DKGActionSchema = SchemaFactory.createForClass(DkgAction);

export function getDkg() {}
