import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';
import { KeyStatus } from 'src/constants';
@Schema({ versionKey: false, _id: false })
export class Key {
    @Prop({ type: String, _id: true, index: true })
    _id: ObjectId;

    @Prop({ require: true })
    committeeId: number;

    @Prop({ required: true })
    keyId: number;

    @Prop({ index: true })
    status: KeyStatus;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
