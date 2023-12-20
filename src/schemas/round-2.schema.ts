import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Round2 {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    committeeId: number;

    @Prop({ index: true })
    keyId: number;

    @Prop()
    memberId: number;

    @Prop({ type: Object })
    contribution: { c: string[]; u: { x: string; y: string }[] };

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type Round2Document = HydratedDocument<Round2>;
export const Round2Schema = SchemaFactory.createForClass(Round2);
