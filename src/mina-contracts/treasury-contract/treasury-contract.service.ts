import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    TreasuryAction,
    getTreasury,
} from 'src/schemas/actions/treasury-action.schema';
import { Model } from 'mongoose';
import { Treasury } from 'src/schemas/treasury.schema';
import { Action } from 'src/interfaces/action.interface';
import { Bool, Field, Provable, PublicKey, Reducer } from 'o1js';
import { Storage } from '@auxo-dev/platform';

@Injectable()
export class TreasuryContractService implements OnModuleInit {
    private readonly _claimed: Storage.TreasuryStorage.ClaimedStorage;
    private readonly _zkApp: Storage.SharedStorage.AddressStorage;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(TreasuryAction.name)
        private readonly treasuryActionModel: Model<TreasuryAction>,
        @InjectModel(Treasury.name)
        private readonly treasuryModel: Model<Treasury>,
    ) {
        this._claimed = new Storage.TreasuryStorage.ClaimedStorage();
        this._zkApp = new Storage.SharedStorage.AddressStorage();
    }

    async onModuleInit() {
        await this.fetch();
    }

    async update() {
        await this.fetch();
    }

    async fetch() {
        try {
            await this.fetchTreasuryActions();
            await this.updateTreasuries();
            await this.createTrees();
        } catch (err) {}
    }

    async fetchTreasuryActions() {
        const lastAction = await this.treasuryActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.TREASURY_ADDRESS,
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
            await this.treasuryActionModel.findOneAndUpdate(
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

    async updateTreasuries() {
        const lastTreasury = await this.treasuryModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let treasuryActions: TreasuryAction[];
        if (lastTreasury != null) {
            treasuryActions = await this.treasuryActionModel.find(
                { actionId: { $gt: lastTreasury.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            treasuryActions = await this.treasuryActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < treasuryActions.length; i++) {
            const treasuryAction = treasuryActions[i];
            await this.treasuryModel.findOneAndUpdate(
                { actionId: treasuryAction.actionId },
                getTreasury(treasuryAction),
                { new: true, upsert: true },
            );
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.TREASURY_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveTreasuryAction =
                await this.treasuryActionModel.findOne({
                    currentActionState: lastActionState,
                });
            const notActiveTreasuries = await this.treasuryModel.find(
                {
                    actionId: { $lte: lastActiveTreasuryAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveTreasuries.length; i++) {
                const notActiveTreasury = notActiveTreasuries[i];
                notActiveTreasury.set('active', true);
                await notActiveTreasury.save();
            }
        }
    }

    async createTrees() {
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

        const treasuries = await this.treasuryModel.aggregate([
            { $match: { active: true } },
            {
                $group: {
                    _id: '$campaignId',
                    projects: { $push: '$$ROOT' },
                },
            },
        ]);
        for (let i = 0; i < treasuries.length; i++) {
            const campaignId = treasuries[i]._id;
            const projects: Treasury[] = treasuries[i].projects;
            for (let j = 0; j < projects.length; j++) {
                const projectId = projects[j].projectId;
                this._claimed.updateLeaf(
                    this._claimed.calculateLeaf(Bool(true)),
                    this._claimed.calculateLevel1Index({
                        campaignId: Field(campaignId),
                        projectId: Field(projectId),
                    }),
                );
            }
        }
    }
}
