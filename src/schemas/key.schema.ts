import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Key {
    @Prop()
    keyId: number;

    @Prop()
    committeeId: number;

    @Prop({ type: Map, of: Array<Point> })
    round1Contributions: Map<string, Point[]>;

    @Prop({ type: Map, of: Object })
    round2Contributions: Map<string, { c: string; u: Point }>;

    @Prop()
    status: string;

    @Prop()
    publicKey: string;
}

export class Point {
    @Prop()
    x: string;

    @Prop()
    y: string;

    constructor(x: string, y: string) {
        this.x = x;
        this.y = y;
    }
}

export type KeyDocument = HydratedDocument<Key>;
export const KeySchema = SchemaFactory.createForClass(Key);
