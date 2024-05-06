import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class ResponseEvent {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop()
    enum: number;

    @Prop({})
    data: string[];
}

export type ResponseEventDocument = HydratedDocument<ResponseEvent>;
export const ResponseEventSchema = SchemaFactory.createForClass(ResponseEvent);
