import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestStatusEnum } from 'src/constants';

export class DkgResponse {
    @Prop()
    memberId: number;

    @Prop()
    dimension: number;

    @Prop()
    rootD: string;

    @Prop({ type: [{ x: String, y: String }] })
    Di: { x: string; y: string }[];
}
@Schema({ versionKey: false })
export class DkgRequest {
    @Prop({ required: true, unique: true, index: true })
    requestId: number;

    @Prop()
    keyIndex: number;

    @Prop({ index: true })
    taskId: string;

    @Prop()
    expirationTimestamp: number;

    @Prop()
    accumulationRoot: string;

    @Prop()
    resultRoot: string;

    @Prop({ type: [DkgResponse], default: [], required: true })
    responses: DkgResponse[];

    @Prop({ type: [{ x: String, y: String }], default: [] })
    finalizedDi?: { x: string; y: string }[];

    @Prop({ default: RequestStatusEnum.INITIALIZED, required: true })
    status?: RequestStatusEnum;
}

export type DkgRequestDocument = HydratedDocument<DkgRequest>;
export const DkgRequestSchema = SchemaFactory.createForClass(DkgRequest);
