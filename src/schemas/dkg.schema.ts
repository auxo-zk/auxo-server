import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DkgActionEnum } from './actions/dkg-action.schema';

@Schema({ versionKey: false })
export class Dkg {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    committeeId: number;

    @Prop()
    keyId?: number;

    @Prop({ index: true })
    actionEnum: DkgActionEnum;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type DkgDocument = HydratedDocument<Dkg>;
export const DkgSchema = SchemaFactory.createForClass(Dkg);
