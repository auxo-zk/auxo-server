import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, PublicKey } from 'o1js';
import { memberTreeHeight } from 'src/mina/committee/committee.service';
import { Committee } from '../committee.schema';

@Schema({ versionKey: false })
export class CommitteeAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);
