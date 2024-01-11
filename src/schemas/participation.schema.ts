import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';

@Schema({ versionKey: false })
export class Participation {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    campaignId: number;

    @Prop({ index: true })
    projectId: number;

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData?: object;

    @Prop()
    currentApplicationInfoHash: string;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type ParticipationDocument = HydratedDocument<Participation>;
export const ParticipationSchema = SchemaFactory.createForClass(Participation);
