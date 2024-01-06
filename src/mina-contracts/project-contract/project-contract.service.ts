import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ProjectAction,
    getRawProject,
} from 'src/schemas/actions/project-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Reducer } from 'o1js';
import { RawProject } from 'src/schemas/raw-project.schema';
import { Project } from 'src/schemas/project.schema';
import { ProjectActionEnum } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';

@Injectable()
export class ProjectContractService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ProjectAction.name)
        private readonly projectActionModel: Model<ProjectAction>,
        @InjectModel(RawProject.name)
        private readonly rawProjectModel: Model<RawProject>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {}

    async onModuleInit() {
        await this.fetch();
    }

    private async fetch() {
        await this.fetchAllProjectActions();
    }

    private async fetchAllProjectActions() {
        const lastAction = await this.projectActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.PROJECT_ADDRESS,
        );
        let previousActionState: Field;
        let actionId: number;
        if (!lastAction) {
            previousActionState = Reducer.initialActionState;
            actionId = 0;
        } else {
            actions = actions.slice(lastAction.actionId + 1);
            previousActionState = Field(lastAction.currentActionState);
            actionId = lastAction.actionId + 1;
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentActionState = Field(action.hash);
            await this.projectActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState.toString(),
                    previousActionState: previousActionState.toString(),
                    actions: action.actions[0],
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
        await this.updateRawProjects();
        await this.updateProjects();
    }

    private async updateRawProjects() {
        const lastRawProject = await this.rawProjectModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let projectActions: ProjectAction[];
        if (lastRawProject != null) {
            projectActions = await this.projectActionModel.find(
                { actionId: { $gt: lastRawProject.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            projectActions = await this.projectActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < projectActions.length; i++) {
            const projectAction = projectActions[i];
            await this.rawProjectModel.findOneAndUpdate(
                { actionId: projectAction.actionId },
                getRawProject(projectAction),
                { new: true, upsert: true },
            );
        }
    }
    private async updateProjects() {
        const rawProjects = await this.rawProjectModel.find(
            { actionEnum: ProjectActionEnum.CREATE_PROJECT },
            {},
            { sort: { actionId: 1 } },
        );
        const lastProject = await this.projectModel.findOne(
            {},
            {},
            { sort: { projectId: -1 } },
        );
        for (
            let projectId = lastProject ? lastProject.projectId + 1 : 0;
            projectId < rawProjects.length;
            projectId++
        ) {
            const rawProject = rawProjects[projectId];
            await this.projectModel.create({
                projectId: projectId,
                members: rawProject.members,
                ipfsHash: rawProject.ipfsHash,
                ipfsData: await this.ipfs.getData(rawProject.ipfsHash),
                payeeAccount: rawProject.payeeAccount,
            });
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.PROJECT_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActiveProjectId = Number(lastEvent[0].data[0]);
            const notActiveProjects = await this.projectModel.find(
                {
                    projectId: { $lte: lastActiveProjectId },
                    active: false,
                },
                {},
                { sort: { projectId: 1 } },
            );
            for (let i = 0; i < notActiveProjects.length; i++) {
                const notActiveProject = notActiveProjects[i];
                notActiveProject.set('active', true);
                await notActiveProject.save();
            }
        }
    }
}
