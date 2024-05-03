import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ProjectAction,
    getProjectActionData,
} from 'src/schemas/actions/project-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Mina, PrivateKey, Provable, PublicKey, Reducer } from 'o1js';
import { Project } from 'src/schemas/project.schema';
import { MaxRetries, ProjectActionEnum, zkAppCache } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { IpfsHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { Utilities } from '../utilities';
import { ProjectState } from 'src/interfaces/zkapp-state.interface';
import * as _ from 'lodash';

@Injectable()
export class ProjectContractService implements ContractServiceInterface {
    private readonly logger = new Logger(ProjectContractService.name);
    private _nextProjectId: number;
    private readonly _memberStorage: Storage.ProjectStorage.ProjectMemberStorage;
    private readonly _ipfsHashStorage: Storage.ProjectStorage.IpfsHashStorage;
    private readonly _treasuryAddressStorage: Storage.ProjectStorage.TreasuryAddressStorage;
    private _actionState: string;

    public get nextProjectId(): number {
        return this._nextProjectId;
    }
    public get memberStorage(): Storage.ProjectStorage.ProjectMemberStorage {
        return this._memberStorage;
    }
    public get ipfsHashStorage(): Storage.ProjectStorage.IpfsHashStorage {
        return this._ipfsHashStorage;
    }
    public get treasuryAddressStorage(): Storage.ProjectStorage.TreasuryAddressStorage {
        return this._treasuryAddressStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ProjectAction.name)
        private readonly projectActionModel: Model<ProjectAction>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {
        this._nextProjectId = 0;
        this._actionState = '';
        this._memberStorage = new Storage.ProjectStorage.ProjectMemberStorage();
        this._ipfsHashStorage = new Storage.ProjectStorage.IpfsHashStorage();
        this._treasuryAddressStorage =
            new Storage.ProjectStorage.TreasuryAddressStorage();
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
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchProjectActions();
                await this.updateProjectActions();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchProjectState(): Promise<ProjectState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.PROJECT_ADDRESS,
        );
        const result: ProjectState = {
            nextProjectId: Field(state[0]),
            memberRoot: Field(state[1]),
            ipfsHashRoot: Field(state[2]),
            treasuryAddressRoot: Field(state[3]),
            actionState: Field(state[4]),
        };
        this._nextProjectId = Number(result.nextProjectId.toBigInt());
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup() {
        try {
            const lastReducedAction = await this.projectActionModel.findOne(
                { active: true },
                {},
                {
                    sort: {
                        actionId: -1,
                    },
                },
            );
            const notReducedActions = await this.projectActionModel.find(
                {
                    actionId: {
                        $gt: lastReducedAction
                            ? lastReducedAction.actionId
                            : -1,
                    },
                },
                {},
                { sort: { actionId: 1 } },
            );
            if (notReducedActions.length > 0) {
                const state = await this.fetchProjectState();
                let nextProjectId = state.nextProjectId;
                let proof = await ZkApp.Project.RollupProject.firstStep(
                    state.nextProjectId,
                    state.memberRoot,
                    state.ipfsHashRoot,
                    state.treasuryAddressRoot,
                    lastReducedAction
                        ? Field(lastReducedAction.currentActionState)
                        : Reducer.initialActionState,
                );
                const memberStorage = _.cloneDeep(this._memberStorage);
                const ipfsHashStorage = _.cloneDeep(this._ipfsHashStorage);
                const treasuryAddressStorage = _.cloneDeep(
                    this._treasuryAddressStorage,
                );
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    if (
                        notReducedAction.actionData.actionType ==
                        Storage.ProjectStorage.ProjectActionEnum.CREATE_PROJECT
                    ) {
                        proof =
                            await ZkApp.Project.RollupProject.createProjectStep(
                                proof,
                                ZkApp.Project.ProjectAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                memberStorage.getLevel1Witness(nextProjectId),
                                ipfsHashStorage.getLevel1Witness(nextProjectId),
                                treasuryAddressStorage.getLevel1Witness(
                                    nextProjectId,
                                ),
                            );
                        memberStorage.updateInternal(
                            nextProjectId,
                            Storage.ProjectStorage.EMPTY_LEVEL_2_PROJECT_MEMBER_TREE(),
                        );
                        for (
                            let j = 0;
                            j < notReducedAction.actionData.members.length;
                            j++
                        ) {
                            memberStorage.updateLeaf(
                                {
                                    level1Index: nextProjectId,
                                    level2Index: Field(j),
                                },
                                memberStorage.calculateLeaf(
                                    PublicKey.fromBase58(
                                        notReducedAction.actionData.members[j],
                                    ),
                                ),
                            );
                        }

                        ipfsHashStorage.updateLeaf(
                            { level1Index: nextProjectId },
                            ipfsHashStorage.calculateLeaf(
                                IpfsHash.fromString(
                                    notReducedAction.actionData.ipfsHash,
                                ),
                            ),
                        );
                        treasuryAddressStorage.updateLeaf(
                            {
                                level1Index: nextProjectId,
                            },
                            treasuryAddressStorage.calculateLeaf(
                                PublicKey.fromBase58(
                                    notReducedAction.actionData.treasuryAddress,
                                ),
                            ),
                        );
                        nextProjectId = nextProjectId.add(1);
                    } else {
                        proof =
                            await ZkApp.Project.RollupProject.updateProjectStep(
                                proof,
                                ZkApp.Project.ProjectAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                IpfsHash.fromString(
                                    notReducedAction.actionData.ipfsHash,
                                ),
                                ipfsHashStorage.getLevel1Witness(
                                    Field(
                                        notReducedAction.actionData.projectId,
                                    ),
                                ),
                            );

                        ipfsHashStorage.updateLeaf(
                            {
                                level1Index: Field(
                                    notReducedAction.actionData.projectId,
                                ),
                            },
                            ipfsHashStorage.calculateLeaf(
                                IpfsHash.fromString(
                                    notReducedAction.actionData.ipfsHash,
                                ),
                            ),
                        );
                    }
                }

                const projectContract = new ZkApp.Project.ProjectContract(
                    PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                const tx = await Mina.transaction(
                    {
                        sender: feePayerPrivateKey.toPublicKey(),
                        fee: process.env.FEE,
                        nonce: await this.queryService.fetchAccountNonce(
                            feePayerPrivateKey.toPublicKey().toBase58(),
                        ),
                    },
                    async () => {
                        await projectContract.rollup(proof);
                    },
                );
                await Utilities.proveAndSend(
                    tx,
                    feePayerPrivateKey,
                    false,
                    this.logger,
                );
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
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
            const actionData = getProjectActionData(action.actions[0]);
            await this.projectActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    actionHash: action.hash,
                    currentActionState: currentActionState.toString(),
                    previousActionState: previousActionState.toString(),
                    actions: action.actions[0],
                    actionData: actionData,
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
    }

    private async updateProjectActions() {
        await this.fetchProjectState();
        const currentAction = await this.projectActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.projectActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveActions.length; i++) {
                const promises = [];
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                promises.push(notActiveAction.save());
                if (
                    notActiveAction.actionData.actionType ==
                    Storage.ProjectStorage.ProjectActionEnum.CREATE_PROJECT
                ) {
                    const ipfsData = await this.ipfs.getData(
                        notActiveAction.actionData.ipfsHash,
                    );
                    promises.push(
                        this.projectModel.findOneAndUpdate(
                            {
                                projectId: this._nextProjectId,
                            },
                            {
                                projectId: this._nextProjectId,
                                members: notActiveAction.actionData.members,
                                ipfsHash: notActiveAction.actionData.ipfsHash,
                                ipfsData: ipfsData,
                                treasuryAddress:
                                    notActiveAction.actionData.treasuryAddress,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                    this._nextProjectId += 1;
                } else {
                    const ipfsData = await this.ipfs.getData(
                        notActiveAction.actionData.ipfsHash,
                    );
                    promises.push(
                        this.projectModel.findOneAndUpdate(
                            {
                                projectId: notActiveAction.actionData.projectId,
                            },
                            {
                                ipfsHash: notActiveAction.actionData.ipfsHash,
                                ipfsData: ipfsData,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                }

                await Promise.all(promises);
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const projects = await this.projectModel.find(
                {},
                {},
                { sort: { projectId: 1 } },
            );

            for (let i = 0; i < projects.length; i++) {
                const project = projects[i];
                const level1Index = this._memberStorage.calculateLevel1Index(
                    Field(project.projectId),
                );
                const ipfsHashLeaf = this._ipfsHashStorage.calculateLeaf(
                    IpfsHash.fromString(project.ipfsHash),
                );
                this._ipfsHashStorage.updateLeaf(
                    { level1Index: level1Index },
                    ipfsHashLeaf,
                );
                const treasuryAddressLeaf =
                    this._treasuryAddressStorage.calculateLeaf(
                        PublicKey.fromBase58(project.treasuryAddress),
                    );
                this._treasuryAddressStorage.updateLeaf(
                    { level1Index: level1Index },
                    treasuryAddressLeaf,
                );
                this._memberStorage.updateInternal(
                    level1Index,
                    Storage.ProjectStorage.EMPTY_LEVEL_2_PROJECT_MEMBER_TREE(),
                );
                for (let i = 0; i < project.members.length; i++) {
                    const level2IndexMember =
                        this._memberStorage.calculateLevel2Index(Field(i));
                    const memberLeaf = this._memberStorage.calculateLeaf(
                        PublicKey.fromBase58(project.members[i]),
                    );
                    this._memberStorage.updateLeaf(
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
