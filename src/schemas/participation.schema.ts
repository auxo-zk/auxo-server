import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';

@Schema({ versionKey: false })
export class Participation {
    @Prop({ index: true })
    campaignId: number;

    @Prop({ index: true })
    projectId: number;

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData?: object;

    @Prop()
    timestamp: number;

    @Prop({ index: true })
    projectIndex: number;

    @Prop({ required: true, default: 0 })
    claimedAmount?: number;
}

export type ParticipationDocument = HydratedDocument<Participation>;
export const ParticipationSchema = SchemaFactory.createForClass(Participation);
