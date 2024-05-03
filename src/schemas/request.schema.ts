import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestStatusEnum } from 'src/constants';

export class DkgResponse {
    committeeId: number;
    keyId: number;
    memberId: number;
    dimension: number;
    rootD: string;
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

    @Prop({ default: RequestStatusEnum.INITIALIZED, required: true })
    status?: RequestStatusEnum;
}

export type DkgRequestDocument = HydratedDocument<DkgRequest>;
export const DkgRequestSchema = SchemaFactory.createForClass(DkgRequest);
