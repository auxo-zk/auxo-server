import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class DkgResponse {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    memberId: number;

    @Prop()
    requestId: string;

    @Prop()
    contribution: { x: string; y: string }[];

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type DkgResponseDocument = HydratedDocument<DkgResponse>;
export const DkgResponseSchema = SchemaFactory.createForClass(DkgResponse);
