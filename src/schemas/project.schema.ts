import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Project {
    @Prop({ required: true, unique: true, index: true })
    projectId: number;

    @Prop()
    members: string[];

    @Prop()
    payeeAccount: string;

    @Prop()
    ipfsHash: string;

    @Prop({ type: Object })
    ipfsData: object;

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type ProjectDocument = HydratedDocument<Project>;
export const ProjectSchema = SchemaFactory.createForClass(Project);
