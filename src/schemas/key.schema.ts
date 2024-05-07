import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';
import { KeyStatusEnum } from 'src/constants';

export class Round1 {
    @Prop()
    memberId: number;

    @Prop({ type: [{ x: String, y: String }] })
    contribution: { x: string; y: string }[];
}

export class Round2Contribution {
    @Prop({ type: [String], default: [] })
    c: string[];

    @Prop({ type: [{ x: String, y: String }], default: [] })
    u: { x: string; y: string }[];
}
export class Round2 {
    @Prop()
    memberId: number;

    @Prop({ type: Round2Contribution })
    contribution: Round2Contribution;
}

@Schema({ versionKey: false })
export class Key {
    @Prop({ index: true, required: true, unique: true })
    keyIndex: number;

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
