import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNumber, IsString } from 'class-validator';
import { HydratedDocument } from 'mongoose';
import { FileInformation } from 'src/entities/file-information.entity';

@Schema({ versionKey: false })
export class ProjectDraft {
    @Prop({ index: true, required: true })
    address: string;

    @Prop()
    name?: string;

    @Prop()
    avatarImage?: string;

    @Prop()
    coverImage?: string;

    @Prop()
    publicKey?: string;

    @Prop()
    description?: string;

    @Prop()
    problemStatement?: string;

    @Prop()
    solution?: string;

    @Prop()
    challengeAndRisk?: string;

    @Prop()
    members?: Member[];

    @Prop({ type: FileInformation, default: [] })
    documents?: FileInformation[];
}

class Member {
    @Prop()
    name?: string;

    @Prop()
    role?: string;

    @Prop()
    link?: string;
}

export type ProjectDraftDocument = HydratedDocument<ProjectDraft>;
export const ProjectDraftSchema = SchemaFactory.createForClass(ProjectDraft);
