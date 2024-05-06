import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ParticipationAction,
    getParticipationActionData,
} from 'src/schemas/actions/participation-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Mina, PrivateKey, Provable, PublicKey, Reducer } from 'o1js';
import { Participation } from 'src/schemas/participation.schema';
import { Ipfs } from 'src/ipfs/ipfs';
import { Constants, Storage, ZkApp } from '@auxo-dev/platform';
import { IpfsHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { MaxRetries, zkAppCache } from 'src/constants';
import { Utilities } from '../utilities';
import { ParticipationState } from 'src/interfaces/zkapp-state.interface';
import * as _ from 'lodash';
import { Campaign } from 'src/schemas/campaign.schema';

@Injectable()
export class ParticipationContractService implements ContractServiceInterface {
    private readonly logger = new Logger(ParticipationContractService.name);
    private readonly _projectIndexStorage: Storage.ParticipationStorage.ProjectIndexStorage;
    private readonly _projectCounterStorage: Storage.ParticipationStorage.ProjectCounterStorage;
    private readonly _ipfsHashStorage: Storage.ParticipationStorage.IpfsHashStorage;
    private readonly _zkAppStorage: Storage.SharedStorage.ZkAppStorage;
    private _actionState: string;

    public get projectIndexStorage(): Storage.ParticipationStorage.ProjectIndexStorage {
        return this._projectIndexStorage;
    }
    public get projectCounterStorage(): Storage.ParticipationStorage.ProjectCounterStorage {
        return this._projectCounterStorage;
    }
    public get ipfsHashStorage(): Storage.ParticipationStorage.IpfsHashStorage {
        return this._ipfsHashStorage;
    }
    public get zkAppStorage(): Storage.SharedStorage.ZkAppStorage {
        return this._zkAppStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ParticipationAction.name)
        private readonly participationActionModel: Model<ParticipationAction>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
    ) {
        this._actionState = '';
        this._projectIndexStorage =
            new Storage.ParticipationStorage.ProjectIndexStorage();
        this._projectCounterStorage =
            new Storage.ParticipationStorage.ProjectCounterStorage();
        this._ipfsHashStorage =
            new Storage.ParticipationStorage.IpfsHashStorage();
        this._zkAppStorage = new Storage.SharedStorage.ZkAppStorage([
            {
                index: Constants.ZkAppEnum.COMMITTEE,
                address: PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.DKG,
                address: PublicKey.fromBase58(process.env.DKG_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.ROUND1,
                address: PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.ROUND2,
                address: PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.RESPONSE,
                address: PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.REQUEST,
                address: PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.PROJECT,
                address: PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.CAMPAIGN,
                address: PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.PARTICIPATION,
                address: PublicKey.fromBase58(
                    process.env.PARTICIPATION_ADDRESS,
                ),
            },
            {
                index: Constants.ZkAppEnum.FUNDING,
                address: PublicKey.fromBase58(process.env.FUNDING_ADDRESS),
            },
            {
                index: Constants.ZkAppEnum.TREASURY_MANAGER,
                address: PublicKey.fromBase58(process.env.TREASURY_ADDRESS),
            },
        ]);
    }

    async onModuleInit() {
        try {
            // await this.fetch();
            // await this.updateMerkleTrees();
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
                await this.fetchParticipationActions();
                await this.updateParticipations();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchParticipationState(): Promise<ParticipationState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.PARTICIPATION_ADDRESS,
        );
        const result: ParticipationState = {
            projectIndexRoot: Field(state[0]),
            projectCounterRoot: Field(state[1]),
            ipfsHashRoot: Field(state[2]),
            zkAppRoot: Field(state[3]),
            actionState: Field(state[4]),
        };
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup(): Promise<boolean> {
        try {
            const lastReducedAction =
                await this.participationActionModel.findOne(
                    { active: true },
                    {},
                    {
                        sort: {
                            actionId: -1,
                        },
                    },
                );
            const notReducedActions = await this.participationActionModel.find(
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
                const state = await this.fetchParticipationState();
                let proof =
                    await ZkApp.Participation.RollupParticipation.firstStep(
                        state.projectIndexRoot,
                        state.projectCounterRoot,
                        state.ipfsHashRoot,
                        lastReducedAction
                            ? Field(lastReducedAction.currentActionState)
                            : Reducer.initialActionState,
                    );
                const projectIndexStorage = _.cloneDeep(
                    this._projectIndexStorage,
                );
                const projectCounterStorage = _.cloneDeep(
                    this._projectCounterStorage,
                );
                const ipfsHashStorage = _.cloneDeep(this._ipfsHashStorage);
                const projectCounterMapping: {
                    [key: number]: number;
                } = {};
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    const campaignId = notReducedAction.actionData.campaignId;
                    if (projectCounterMapping[campaignId] == undefined) {
                        const campaign = await this.campaignModel.findOne({
                            campaignId: campaignId,
                        });
                        projectCounterMapping[campaignId] =
                            campaign.projectCounter;
                    }
                    const level1Index =
                        projectIndexStorage.calculateLevel1Index({
                            campaignId: Field(campaignId),
                            projectId: Field(
                                notReducedAction.actionData.projectId,
                            ),
                        });
                    proof =
                        await ZkApp.Participation.RollupParticipation.participateCampaignStep(
                            proof,
                            ZkApp.Participation.ParticipationAction.fromFields(
                                Utilities.stringArrayToFields(
                                    notReducedAction.actions,
                                ),
                            ),
                            Field(projectCounterMapping[campaignId]),
                            projectIndexStorage.getLevel1Witness(level1Index),
                            projectCounterStorage.getLevel1Witness(
                                Field(campaignId),
                            ),
                            ipfsHashStorage.getLevel1Witness(level1Index),
                        );
                    projectCounterMapping[campaignId] += 1;
                    projectIndexStorage.updateLeaf(
                        level1Index,
                        Field(projectCounterMapping[campaignId]),
                    );
                    projectCounterStorage.updateLeaf(
                        Field(campaignId),
                        Field(projectCounterMapping[campaignId]),
                    );
                    ipfsHashStorage.updateLeaf(
                        level1Index,
                        ipfsHashStorage.calculateLeaf(
                            IpfsHash.fromString(
                                notReducedAction.actionData.ipfsHash,
                            ),
                        ),
                    );
                }

                const participationContract =
                    new ZkApp.Participation.ParticipationContract(
                        PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
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
                        await participationContract.rollup(proof);
                    },
                );
                await Utilities.proveAndSend(
                    tx,
                    feePayerPrivateKey,
                    false,
                    this.logger,
                );
                return true;
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    // ====== PRIVATE FUNCTIONS =====

    private async fetchParticipationActions() {
        const lastAction = await this.participationActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.PARTICIPATION_ADDRESS,
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
            const actionData = getParticipationActionData(action.actions[0]);
            await this.participationActionModel.findOneAndUpdate(
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

    private async updateParticipations() {
        await this.fetchParticipationState();
        const currentAction = await this.participationActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.participationActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );

            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                const campaign = await this.campaignModel.findOne({
                    campaignId: notActiveAction.actionData.campaignId,
                });
                const projectIndex = campaign.projectCounter + 1;
                campaign.set('projectCounter', campaign.projectCounter + 1);
                const ipfsData = await this.ipfs.getData(
                    notActiveAction.actionData.ipfsHash,
                );
                await Promise.all([
                    notActiveAction.save(),
                    campaign.save(),
                    this.participationModel.findOneAndUpdate(
                        {
                            campaignId: notActiveAction.actionData.campaignId,
                            projectId: notActiveAction.actionData.projectId,
                        },
                        {
                            campaignId: notActiveAction.actionData.campaignId,
                            projectId: notActiveAction.actionData.projectId,
                            ipfsHash: notActiveAction.actionData.ipfsHash,
                            ipfsData: ipfsData,
                            timestamp: notActiveAction.actionData.timestamp,
                            projectIndex: projectIndex,
                        },
                        { new: true, upsert: true },
                    ),
                ]);
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const participations = await this.participationModel.aggregate([
                { $sort: { timestamp: 1 } },
                {
                    $group: {
                        _id: '$campaignId',
                        projects: { $push: '$$ROOT' },
                    },
                },
            ]);
            for (let i = 0; i < participations.length; i++) {
                const campaignId = Field(participations[i]._id);
                const projects: Participation[] = participations[i].projects;

                for (let j = 0; j < projects.length; j++) {
                    const project = projects[j];
                    const projectId = Field(project.projectId);
                    const level1Index =
                        this._projectIndexStorage.calculateLevel1Index({
                            campaignId: campaignId,
                            projectId: projectId,
                        });
                    const projectIndexLeaf = Field(project.projectIndex);
                    this._projectIndexStorage.updateLeaf(
                        level1Index,
                        projectIndexLeaf,
                    );
                    const ipfsHashLeaf = this._ipfsHashStorage.calculateLeaf(
                        IpfsHash.fromString(project.ipfsHash),
                    );
                    this._ipfsHashStorage.updateLeaf(level1Index, ipfsHashLeaf);
                    this._projectCounterStorage.updateLeaf(
                        campaignId,
                        Field(projects.length),
                    );
                }
            }
        } catch (err) {}
    }
}
