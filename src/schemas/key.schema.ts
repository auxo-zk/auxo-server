import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Key {
    @Prop({ required: true, unique: true })
    keyId: number;

    @Prop()
    committeeId: number;

    @Prop()
    memberId: number;

    @Prop()
    round1Contributions: Map<string, Round1Contribution>;

    @Prop()
    round2Contributions: Map<string, Round2Contribution>;
}

export class Round1Contribution {
    c: { x: string; y: string }[];
}

export class Round2Contribution {
    u: { x: string; y: string };
    c: string;
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
