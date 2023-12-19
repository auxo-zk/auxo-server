import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestActionEnum } from './actions/request-action.schema';

export const enum RequestStatusEnum {
    NOT_YET_REQUESTED,
    REQUESTING,
    // RESOLVED, this will be hash of request vector D: H(length + values)
}

@Schema({ versionKey: false })
export class DkgRequest {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

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
