import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Round1 {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    memberId: number;

    @Prop()
    contribution: { x: string; y: string }[];

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type Round1Document = HydratedDocument<Round1>;
export const Round1Schema = SchemaFactory.createForClass(Round1);
