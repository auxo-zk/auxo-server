import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ProjectAction,
    getRawProject,
} from 'src/schemas/actions/project-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Mina, PrivateKey, Provable, PublicKey, Reducer } from 'o1js';
import { RawProject } from 'src/schemas/raw-project.schema';
import { Project } from 'src/schemas/project.schema';
import { ProjectActionEnum, zkAppCache } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';
import {
    CreateProject,
    ProjectContract,
    Storage,
    ZkApp,
} from '@auxo-dev/platform';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { Utilities } from '../utilities';
import { ProjectState } from 'src/interfaces/zkapp-state.interface';

@Injectable()
export class ProjectContractService implements ContractServiceInterface {
    private readonly logger = new Logger(ProjectContractService.name);
    private readonly _info: Storage.ProjectStorage.InfoStorage;
    private readonly _member: Storage.ProjectStorage.MemberStorage;
    private readonly _payee: Storage.ProjectStorage.AddressStorage;

    public get info(): Storage.ProjectStorage.InfoStorage {
        return this._info;
    }
    public get member(): Storage.ProjectStorage.MemberStorage {
        return this._member;
    }
    public get payee(): Storage.ProjectStorage.AddressStorage {
        return this._payee;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ProjectAction.name)
        private readonly projectActionModel: Model<ProjectAction>,
        @InjectModel(RawProject.name)
        private readonly rawProjectModel: Model<RawProject>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {
        this._info = new Storage.ProjectStorage.InfoStorage();
        this._member = new Storage.ProjectStorage.MemberStorage();
        this._payee = new Storage.ProjectStorage.AddressStorage();
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async update() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async fetch() {
        try {
            await this.fetchProjectActions();
            await this.updateRawProjects();
            await this.updateProjects();
        } catch (err) {
            console.log(err);
        }
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(CreateProject, cache, this.logger);
        await Utilities.compile(ProjectContract, cache, this.logger);
    }

    async fetchProjectState(): Promise<ProjectState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.PROJECT_ADDRESS,
        );
        const result: ProjectState = {
            nextProjectId: Field(state[0]),
            member: Field(state[1]),
            info: Field(state[2]),
            payee: Field(state[3]),
            actionState: Field(state[4]),
        };
        return result;
    }

    async rollupProject() {
        const lastActiveProject = await this.projectModel.findOne(
            { active: true },
            {},
            { sort: { projectId: -1 } },
        );
        const lastReducedAction = lastActiveProject
            ? await this.projectActionModel.findOne({
                  actionId: lastActiveProject.projectId,
              })
            : undefined;
        const notReducedActions = await this.projectActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const notActiveProjects = await this.projectModel.find(
                {
                    projectId: {
                        $gt: lastActiveProject
                            ? lastActiveProject.projectId
                            : -1,
                    },
                },
                {},
                { sort: { actionId: 1 } },
            );
            const state = await this.fetchProjectState();
            let nextProjectId = lastActiveProject
                ? lastActiveProject.projectId + 1
                : 0;
            let proof = await CreateProject.firstStep(
                state.nextProjectId,
                state.member,
                state.info,
                state.payee,
                lastReducedAction
                    ? Field(lastReducedAction.currentActionState)
                    : Reducer.initialActionState,
            );
            const member = this._member;
            const info = this._info;
            const payee = this._payee;

            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                const notActiveProject = notActiveProjects[i];
                proof = await CreateProject.nextStep(
                    proof,
                    ZkApp.Project.ProjectAction.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    member.getLevel1Witness(
                        member.calculateLevel1Index(Field(nextProjectId)),
                    ),
                    info.getLevel1Witness(
                        info.calculateLevel1Index(Field(nextProjectId)),
                    ),
                    payee.getLevel1Witness(
                        payee.calculateLevel1Index(Field(nextProjectId)),
                    ),
                );
                member.updateInternal(
                    Field(nextProjectId),
                    Storage.ProjectStorage.EMPTY_LEVEL_2_TREE(),
                );
                for (let j = 0; j < notActiveProject.members.length; j++) {
                    member.updateLeaf(
                        {
                            level1Index: Field(nextProjectId),
                            level2Index: Field(j),
                        },
                        member.calculateLeaf(
                            PublicKey.fromBase58(notActiveProject.members[j]),
                        ),
                    );
                }
                info.updateLeaf(
                    { level1Index: Field(nextProjectId) },
                    info.calculateLeaf(
                        IPFSHash.fromString(notActiveProject.ipfsHash),
                    ),
                );
                payee.updateLeaf(
                    { level1Index: Field(nextProjectId) },
                    payee.calculateLeaf(
                        PublicKey.fromBase58(notActiveProject.payeeAccount),
                    ),
                );
                nextProjectId += 1;
            }
            const projectContract = new ProjectContract(
                PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            const tx = await Mina.transaction(
                {
                    sender: feePayerPrivateKey.toPublicKey(),
                    fee: process.env.FEE,
                },
                () => {
                    projectContract.rollup(proof);
                },
            );
            await Utilities.proveAndSend(
                tx,
                feePayerPrivateKey,
                false,
                this.logger,
            );
        }
    }

    // ====== PRIVATE FUNCTIONS ========

    private async fetchProjectActions() {
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

    async updateMerkleTrees() {
        try {
            const projects = await this.projectModel.find(
                { active: true },
                {},
                { sort: { projectId: 1 } },
            );

            for (let i = 0; i < projects.length; i++) {
                const project = projects[i];
                const level1Index = this._info.calculateLevel1Index(
                    Field(project.projectId),
                );
                const infoLeaf = this._info.calculateLeaf(
                    IPFSHash.fromString(project.ipfsHash),
                );
                this._info.updateLeaf({ level1Index: level1Index }, infoLeaf);
                const payeeLeaf = this._payee.calculateLeaf(
                    PublicKey.fromBase58(project.payeeAccount),
                );
                this._payee.updateLeaf({ level1Index: level1Index }, payeeLeaf);
                this._member.updateInternal(
                    level1Index,
                    Storage.ProjectStorage.EMPTY_LEVEL_2_TREE(),
                );
                for (let i = 0; i < project.members.length; i++) {
                    const level2IndexMember = this._member.calculateLevel2Index(
                        Field(i),
                    );
                    const memberLeaf = this._member.calculateLeaf(
                        PublicKey.fromBase58(project.members[i]),
                    );
                    this._member.updateLeaf(
                        {
                            level1Index: level1Index,
                            level2Index: level2IndexMember,
                        },
                        memberLeaf,
                    );
                }
            }
        } catch (err) {}
    }
}
