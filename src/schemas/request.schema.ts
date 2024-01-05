import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestStatusEnum } from 'src/constants';

@Schema({ versionKey: false })
export class DkgRequest {
    @Prop({ required: true, unique: true, index: true })
    requestId: string;

    @Prop({ index: true })
    committeeId?: number;

    @Prop({ index: true })
    keyId?: number;

    @Prop()
    requester?: string;

    @Prop()
    R?: { x: string; y: string }[];

    @Prop()
    D?: { x: string; y: string }[];

    @Prop({ default: RequestStatusEnum.NOT_YET_REQUESTED })
    status: RequestStatusEnum;
}

export type DkgRequestDocument = HydratedDocument<DkgRequest>;
export const DkgRequestSchema = SchemaFactory.createForClass(DkgRequest);
