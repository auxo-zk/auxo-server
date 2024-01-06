import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { RawProject } from '../raw-project.schema';
import { Field, PublicKey } from 'o1js';
import { ProjectActionEnum } from 'src/constants';

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

export function getRawProject(projectAction: ProjectAction): RawProject {
    const action = ZkApp.Project.ProjectAction.fromFields(
        Utilities.stringArrayToFields(projectAction.actions),
    );
    const members: string[] = [];
    for (let i = 0; i < action.members.length.toBigInt(); i++) {
        const publicKey = PublicKey.from(action.members.values[i]);
        members.push(publicKey.toBase58());
    }
    if (action.projectId.equals(Field(-1))) {
        return {
            actionId: projectAction.actionId,
            members: members,
            ipfsHash: action.ipfsHash.toString(),
            payeeAccount: action.payeeAccount.toBase58(),
            actionEnum: ProjectActionEnum.CREATE_PROJECT,
        };
    } else {
        return {
            actionId: projectAction.actionId,
            projectId: Number(action.projectId.toString()),
            members: members,
            ipfsHash: action.ipfsHash.toString(),
            payeeAccount: action.payeeAccount.toBase58(),
            actionEnum: ProjectActionEnum.UPDATE_PROJECT,
        };
    }
}
