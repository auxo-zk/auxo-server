import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Committee {
    @Prop()
    committeeId: string;

    @Prop()
    numberOfMembers: string;

    @Prop()
    threshold: string;

    @Prop()
    publicKeys: string[];
}

export type CommitteeDocument = HydratedDocument<Committee>;
export const CommitteeSchema = SchemaFactory.createForClass(Committee);
