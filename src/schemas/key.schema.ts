import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';

export const enum KeyStatus {
    EMPTY,
    ROUND_1_CONTRIBUTION,
    ROUND_2_CONTRIBUTION,
    ACTIVE,
    DEPRECATED,
}
@Schema({ versionKey: false })
export class Key {
    @Prop({ type: String, _id: true, index: true })
    _id: ObjectId;

    @Prop({ require: true })
    committeeId: number;

    @Prop({ required: true })
    keyId: number;

    @Prop()
    status: KeyStatus;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
