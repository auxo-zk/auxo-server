import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Committee {
    @Prop({ required: true, unique: true })
    committeeId: number;

    @Prop()
    numberOfMembers: number;

    @Prop()
    threshold: number;

    @Prop()
    publicKeys: string[];

    @Prop()
    blockHeight: number;
}

export type CommitteeDocument = HydratedDocument<Committee>;
export const CommitteeSchema = SchemaFactory.createForClass(Committee);
