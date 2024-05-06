import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { Field, PublicKey } from 'o1js';
import { ProjectActionEnum } from 'src/constants';

export class ProjectActionData {
    actionType: Storage.ProjectStorage.ProjectActionEnum;
    projectId: number;
    members: string[];
    ipfsHash: string;
    treasuryAddress: string;

    static fromAction(action: ZkApp.Project.ProjectAction): ProjectActionData {
        const members: string[] = [];
        for (let i = 0; i < action.members.length.toBigInt(); i++) {
            const publicKey = PublicKey.from(action.members.values[i]);
            members.push(publicKey.toBase58());
        }
        return {
            actionType: Number(action.actionType.toBigInt()),
            projectId: Number(action.projectId.toBigInt()),
            members: members,
            ipfsHash: action.ipfsHash.toString(),
            treasuryAddress: action.treasuryAddress.toBase58(),
        };
    }
}
@Schema({ versionKey: false })
export class ProjectAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop([String])
    actions: string[];

    @Prop()
    actionData: ProjectActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type ProjectActionDocument = HydratedDocument<ProjectAction>;
export const ProjectActionSchema = SchemaFactory.createForClass(ProjectAction);

export function getProjectActionData(actions: string[]): ProjectActionData {
    const action = ZkApp.Project.ProjectAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return ProjectActionData.fromAction(action);
}
