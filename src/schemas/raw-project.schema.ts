import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProjectActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class RawProject {
    @Prop({ required: true, unique: true, index: true })
    actionId: number;

    @Prop({ index: true })
    projectId?: number;

    @Prop()
    members: string[];

    @Prop()
    ipfsHash: string;

    @Prop()
    payeeAccount: string;

    @Prop()
    actionEnum: ProjectActionEnum;
}

export type RawProjectDocument = HydratedDocument<RawProject>;
export const RawProjectSchema = SchemaFactory.createForClass(RawProject);
