import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Key {
    @Prop({ required: true, unique: true })
    keyIndex: number;

    @Prop()
    committeeIndex: number;

    @Prop()
    memberId: number;

    @Prop()
    round1Contributions: Round1Contribution[];

    @Prop()
    round2Contributions: Round2Contribution[];
}

export class Round1Contribution {
    memberIndex: number;
    c: { x: string; y: string }[];
}

export class Round2Contribution {
    memberIndex: number;
    u: { x: string; y: string };
    c: string;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
