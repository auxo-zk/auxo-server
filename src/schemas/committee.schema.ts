import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNumber, IsString } from 'class-validator';
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

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData?: object;
}

export type CommitteeDocument = HydratedDocument<Committee>;
export const CommitteeSchema = SchemaFactory.createForClass(Committee);
