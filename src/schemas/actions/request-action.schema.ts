import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';

@Schema({ versionKey: false })
export class RequestAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type RequestActionDocument = HydratedDocument<RequestAction>;
export const RequestActionSchema = SchemaFactory.createForClass(RequestAction);
