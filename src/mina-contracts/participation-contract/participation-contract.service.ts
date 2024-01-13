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

@Injectable()
export class ParticipationContractService implements OnModuleInit {
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
        this._zkApp = new Storage.SharedStorage.AddressStorage();
    }

    async onModuleInit() {
        await this.fetch();
        // Provable.log(this._counter.level1.getRoot());
        // Provable.log(this._index.level1.getRoot());
        // Provable.log(this._info.level1.getRoot());
        // Provable.log(
        //     await this.queryService.fetchZkAppState(
        //         process.env.PARTICIPATION_ADDRESS,
        //     ),
        // );
    }

    async update() {
        await this.fetch();
    }

    private async fetch() {
        try {
            await this.fetchParticipationActions();
            await this.updateParticipations();
            await this.createTrees();
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

    async createTrees() {
        // Constants.ZkAppEnum.
        this._zkApp.addresses.setLeaf(
            0n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            1n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.DKG_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            2n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            3n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            0n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            4n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            5n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            6n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            7n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            8n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.FUNDING_ADDRESS),
            ),
        );
        this._zkApp.addresses.setLeaf(
            9n,
            this._zkApp.calculateLeaf(
                PublicKey.fromBase58(process.env.TREASURY_ADDRESS),
            ),
        );
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
            this._counter.updateLeaf(counterLeaf, level1Index);
            for (let j = 0; j < projects.length; j++) {
                const project = projects[j];
                const index = this._index.calculateLevel1Index({
                    campaignId: Field(campaignId),
                    projectId: Field(project.projectId),
                });
                const indexLeaf = this._index.calculateLeaf(Field(j + 1));
                this._index.updateLeaf(indexLeaf, index);
                const infoLeaf = this._info.calculateLeaf(
                    IPFSHash.fromString(project.ipfsHash),
                );
                this._info.updateLeaf(infoLeaf, index);
            }
        }
    }
}
