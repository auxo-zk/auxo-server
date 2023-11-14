import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Committee {
    @Prop({ required: true, unique: true, index: true })
    committeeId: number;

    @Prop()
    numberOfMembers: number;

    @Prop()
    threshold: number;

    @Prop()
    publicKeys: string[];

    @Prop({ required: true, default: false })
    active: boolean;

    @Prop()
    ipfsHash: string;

    @Prop()
    blockHeight: number;
}

export type CommitteeDocument = HydratedDocument<Committee>;
export const CommitteeSchema = SchemaFactory.createForClass(Committee);
