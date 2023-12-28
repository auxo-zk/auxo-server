import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class DkgRequest {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    committeeId?: number;

    @Prop({ index: true })
    keyId?: number;

    @Prop({ index: true })
    requestId: string;

    @Prop()
    requester: string;

    @Prop()
    R: { x: string; y: string }[];

    @Prop()
    D: { x: string; y: string }[];

    @Prop()
    actionEnum: RequestActionEnum;

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type DkgRequestDocument = HydratedDocument<DkgRequest>;
export const DkgRequestSchema = SchemaFactory.createForClass(DkgRequest);
