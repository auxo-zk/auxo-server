import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ZkApp } from '@auxo-dev/dkg';

@Schema({ versionKey: false })
export class ProjectAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type ProjectActionDocument = HydratedDocument<ProjectAction>;
export const ProjectActionSchema = SchemaFactory.createForClass(ProjectAction);

export function getProject(projectAction: ProjectAction) {}
