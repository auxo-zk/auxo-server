import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ParticipationAction,
    getParticipation,
} from 'src/schemas/actions/participation-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Mina, PrivateKey, Provable, PublicKey, Reducer } from 'o1js';
import { Participation } from 'src/schemas/participation.schema';
import { Ipfs } from 'src/ipfs/ipfs';
import {
    Constants,
    JoinCampaign,
    ParticipationContract,
    Storage,
    ZkApp,
} from '@auxo-dev/platform';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { zkAppCache } from 'src/constants';
import { Utilities } from '../utilities';
import { ParticipationState } from 'src/interfaces/zkapp-state.interface';

@Injectable()
export class ParticipationContractService implements ContractServiceInterface {
    private readonly logger = new Logger(ParticipationContractService.name);
    private readonly _counter: Storage.ParticipationStorage.CounterStorage;
    private readonly _index: Storage.ParticipationStorage.IndexStorage;
    private readonly _info: Storage.ParticipationStorage.InfoStorage;
    private readonly _zkApp: Storage.SharedStorage.AddressStorage;

    public get counter(): Storage.ParticipationStorage.CounterStorage {
        return this._counter;
    }
    public get index(): Storage.ParticipationStorage.IndexStorage {
        return this._index;
    }
    public get info(): Storage.ParticipationStorage.InfoStorage {
        return this._info;
    }
    public get zkApp(): Storage.SharedStorage.AddressStorage {
        return this._zkApp;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ParticipationAction.name)
        private readonly participationActionModel: Model<ParticipationAction>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
    ) {
        this._counter = new Storage.ParticipationStorage.CounterStorage();
        this._index = new Storage.ParticipationStorage.IndexStorage();
        this._info = new Storage.ParticipationStorage.InfoStorage();
        this._zkApp = new Storage.SharedStorage.AddressStorage([
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
                index: Constants.ZkAppEnum.TREASURY,
                address: PublicKey.fromBase58(process.env.TREASURY_ADDRESS),
            },
        ]);
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
            await this.fetchParticipationActions();
            await this.updateParticipations();
        } catch (err) {}
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(JoinCampaign, cache, this.logger);
        await Utilities.compile(ParticipationContract, cache, this.logger);
    }

    async fetchParticipationState(): Promise<ParticipationState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.PARTICIPATION_ADDRESS,
        );
        return {
            index: Field(state[0]),
            info: Field(state[1]),
            counter: Field(state[2]),
            zkApp: Field(state[3]),
            actionState: Field(state[4]),
        };
    }

    async rollupParticipation(): Promise<boolean> {
        const lastActiveParticipation = await this.participationModel.findOne(
            { active: true },
            {},
            { sort: { actionId: -1 } },
        );
        const lastReducedAction = lastActiveParticipation
            ? await this.participationActionModel.findOne({
                  actionId: lastActiveParticipation.actionId,
              })
            : undefined;
        const notReducedActions = await this.participationActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const notActiveParticipations = await this.participationModel.find(
                {
                    projectId: {
                        $gt: lastActiveParticipation
                            ? lastActiveParticipation.actionId
                            : -1,
                    },
                },
                {},
                { sort: { actionId: 1 } },
            );
            const state = await this.fetchParticipationState();
            let proof = await JoinCampaign.firstStep(
                state.index,
                state.info,
                state.counter,
                lastReducedAction
                    ? Field(lastReducedAction.currentActionState)
                    : Reducer.initialActionState,
            );
            const index = this._index;
            const info = this._info;
            const counter = this._counter;
            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                const notActiveParticipation = notActiveParticipations[i];
                const projectIndex =
                    (
                        await this.participationModel.aggregate([
                            // Step 1: Filter by campaignId
                            {
                                $match: {
                                    campaignId:
                                        notActiveParticipation.campaignId,
                                },
                            },
                            // Step 2: Sort by actionId
                            {
                                $sort: {
                                    actionId: 1,
                                },
                            },
                            // Step 3: Group and collect actionIds into an array
                            {
                                $group: {
                                    _id: '$campaignId',
                                    actionIds: {
                                        $push: '$actionId',
                                    },
                                },
                            },
                            // Step 4: Project the index of your actionId in the array
                            {
                                $project: {
                                    order: {
                                        $indexOfArray: [
                                            '$actionIds',
                                            notActiveParticipation.actionId,
                                        ],
                                    },
                                },
                            },
                        ])
                    )[0]['order'] + 1;
                proof = await JoinCampaign.joinCampaign(
                    proof,
                    ZkApp.Participation.ParticipationAction.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    index.getLevel1Witness(
                        index.calculateLevel1Index({
                            campaignId: Field(
                                notActiveParticipation.campaignId,
                            ),
                            projectId: Field(notActiveParticipation.projectId),
                        }),
                    ),
                    info.getLevel1Witness(
                        info.calculateLevel1Index({
                            campaignId: Field(
                                notActiveParticipation.campaignId,
                            ),
                            projectId: Field(notActiveParticipation.projectId),
                        }),
                    ),
                    Field(projectIndex - 1),
                    counter.getLevel1Witness(
                        counter.calculateLevel1Index(
                            Field(notActiveParticipation.campaignId),
                        ),
                    ),
                );

                index.updateLeaf(
                    index.calculateLevel1Index({
                        campaignId: Field(notActiveParticipation.campaignId),
                        projectId: Field(notActiveParticipation.projectId),
                    }),
                    index.calculateLeaf(Field(projectIndex)),
                );
                info.updateLeaf(
                    info.calculateLevel1Index({
                        campaignId: Field(notActiveParticipation.campaignId),
                        projectId: Field(notActiveParticipation.projectId),
                    }),
                    info.calculateLeaf(
                        IPFSHash.fromString(notActiveParticipation.ipfsHash),
                    ),
                );
                counter.updateLeaf(
                    counter.calculateLevel1Index(
                        Field(notActiveParticipation.campaignId),
                    ),
                    counter.calculateLeaf(Field(projectIndex)),
                );
            }
            const participationContract = new ParticipationContract(
                PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
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
                    participationContract.rollup(proof);
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
        return false;
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
            await this.participationActionModel.findOneAndUpdate(
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

    private async updateParticipations() {
        const lastParticipation = await this.participationModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let participationActions: ParticipationAction[];
        if (lastParticipation != null) {
            participationActions = await this.participationActionModel.find(
                { actionId: { $gt: lastParticipation.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            participationActions = await this.participationActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < participationActions.length; i++) {
            const participationAction = participationActions[i];
            const participation = getParticipation(participationAction);
            participation.ipfsData = await this.ipfs.getData(
                participation.ipfsHash,
            );
            await this.participationModel.findOneAndUpdate(
                { actionId: participationAction.actionId },
                participation,
                { new: true, upsert: true },
            );
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.PARTICIPATION_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveParticipationAction =
                await this.participationActionModel.findOne({
                    currentActionState: lastActionState,
                });
            const notActiveParticipations = await this.participationModel.find(
                {
                    actionId: { $lte: lastActiveParticipationAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveParticipations.length; i++) {
                const notActiveParticipation = notActiveParticipations[i];
                notActiveParticipation.set('active', true);
                await notActiveParticipation.save();
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const participations = await this.participationModel.aggregate([
                { $match: { active: true } },
                { $sort: { actionId: 1 } },
                {
                    $group: {
                        _id: '$campaignId',
                        projects: { $push: '$$ROOT' },
                    },
                },
            ]);
            for (let i = 0; i < participations.length; i++) {
                const campaignId = participations[i]._id;
                const projects: Participation[] = participations[i].projects;

                const level1Index = this._counter.calculateLevel1Index(
                    Field(campaignId),
                );
                const counterLeaf = this._counter.calculateLeaf(
                    Field(projects.length),
                );
                this._counter.updateLeaf(level1Index, counterLeaf);
                for (let j = 0; j < projects.length; j++) {
                    const project = projects[j];
                    const index = this._index.calculateLevel1Index({
                        campaignId: Field(campaignId),
                        projectId: Field(project.projectId),
                    });
                    const indexLeaf = this._index.calculateLeaf(Field(j + 1));
                    this._index.updateLeaf(index, indexLeaf);
                    const infoLeaf = this._info.calculateLeaf(
                        IPFSHash.fromString(project.ipfsHash),
                    );
                    this._info.updateLeaf(index, infoLeaf);
                }
            }
        } catch (err) {}
    }
}
