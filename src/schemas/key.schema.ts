import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';
import { KeyStatusEnum } from 'src/constants';

export class Round1 {
    memberId: number;
    contribution: { x: string; y: string }[];
}

export class Round2 {
    memberId: number;
    contribution: { c: string[]; u: { x: string; y: string }[] };
}

@Schema({ versionKey: false, _id: false })
export class Key {
    @Prop({ type: Number, _id: true, index: true })
    _id: ObjectId;

    @Prop({ require: true })
    committeeId: number;

    @Prop({ required: true })
    keyId: number;

    @Prop()
    key?: string;

    @Prop({ type: [Round1], default: [] })
    round1s: Round1[];

    @Prop({ type: [Round2], default: [] })
    round2s: Round2[];

    @Prop({ index: true })
    status: KeyStatusEnum;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
