import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ParticipationAction,
    getParticipation,
} from 'src/schemas/actions/participation-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Provable, PublicKey, Reducer } from 'o1js';
import { Participation } from 'src/schemas/participation.schema';
import { Ipfs } from 'src/ipfs/ipfs';
import { Constants, Storage } from '@auxo-dev/platform';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';

@Injectable()
export class ParticipationContractService implements ContractServiceInterface {
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
