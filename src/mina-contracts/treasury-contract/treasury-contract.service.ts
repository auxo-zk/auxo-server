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
import { Constants, Storage } from '@auxo-dev/platform';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';

@Injectable()
export class TreasuryContractService implements ContractServiceInterface {
    private readonly _claimed: Storage.TreasuryStorage.ClaimedStorage;
    private readonly _zkApp: Storage.SharedStorage.AddressStorage;

    public get claimed(): Storage.TreasuryStorage.ClaimedStorage {
        return this._claimed;
    }
    public get zkApp(): Storage.SharedStorage.AddressStorage {
        return this._zkApp;
    }

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(TreasuryAction.name)
        private readonly treasuryActionModel: Model<TreasuryAction>,
        @InjectModel(Treasury.name)
        private readonly treasuryModel: Model<Treasury>,
    ) {
        this._claimed = new Storage.TreasuryStorage.ClaimedStorage();
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
                index: Constants.ZkAppEnum.DKG,
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
            await this.fetchTreasuryActions();
            await this.updateTreasuries();
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

    async updateMerkleTrees() {
        try {
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
        } catch (err) {}
    }
}
