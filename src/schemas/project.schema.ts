import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Project {
    @Prop({ required: true, unique: true, index: true })
    projectId: number;

    @Prop([String])
    members: string[];

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData?: object;

    @Prop({ default: 0, required: true })
    totalClaimedAmount: number;

    @Prop({ default: 0, required: true })
    totalFundedAmount: number;

    @Prop()
    treasuryAddress: string;
}

export type ProjectDocument = HydratedDocument<Project>;
export const ProjectSchema = SchemaFactory.createForClass(Project);
