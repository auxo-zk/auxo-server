import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Round1Contribution {
    @Prop({ required: true, unique: true })
    actionId: number;

    @Prop()
    committeeId: number;

    @Prop()
    keyId: number;

    @Prop()
    memberId: number;

    @Prop()
    contribution: { x: string; y: string }[];

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type Round1ContributionDocument = HydratedDocument<Round1Contribution>;
export const Round1ContributionSchema =
    SchemaFactory.createForClass(Round1Contribution);
