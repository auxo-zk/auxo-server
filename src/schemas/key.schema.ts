import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const enum KeyStatus {
    EMPTY,
    ROUND_1_CONTRIBUTION,
    ROUND_2_CONTRIBUTION,
    ACTIVE,
    DEPRECATED,
}
@Schema({ versionKey: false })
export class Key {
    @Prop({ required: true, unique: true, index: true })
    keyId: number;

    @Prop()
    status: KeyStatus;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
