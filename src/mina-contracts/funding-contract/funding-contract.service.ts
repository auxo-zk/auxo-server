import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    FundingAction,
    getFunding,
} from 'src/schemas/actions/funding-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Group, Provable, PublicKey, Reducer } from 'o1js';
import { Funding } from 'src/schemas/funding.schema';
import { FundingEventEnum } from 'src/constants';
import { Constants, Storage, ZkApp } from '@auxo-dev/platform';
import { ZkApp as DkgZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { FundingResult } from 'src/schemas/funding-result.schema';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';

@Injectable()
export class FundingContractService implements ContractServiceInterface {
    private readonly _totalM: Storage.FundingStorage.ValueStorage;
    private readonly _totalR: Storage.FundingStorage.ValueStorage;
    private readonly _requestId: Storage.FundingStorage.RequestIdStorage;
    private readonly _zkApp: Storage.SharedStorage.AddressStorage;

    public get totalM(): Storage.FundingStorage.ValueStorage {
        return this._totalM;
    }
    public get totalR(): Storage.FundingStorage.ValueStorage {
        return this._totalR;
    }
    public get requestId(): Storage.FundingStorage.RequestIdStorage {
        return this._requestId;
    }
    public get zkApp(): Storage.SharedStorage.AddressStorage {
        return this._zkApp;
    }
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(FundingAction.name)
        private readonly fundingActionModel: Model<FundingAction>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
        @InjectModel(FundingResult.name)
        private readonly fundingResultModel: Model<FundingResult>,
    ) {
        this._totalM = new Storage.FundingStorage.ValueStorage();
        this._totalR = new Storage.FundingStorage.ValueStorage();
        this._requestId = new Storage.FundingStorage.RequestIdStorage();
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
            await this.bruteForceFundingResults();
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
            await this.fetchFundingActions();
            await this.updateFundings();
        } catch (err) {
            console.log(err);
        }
    }

    private async fetchFundingActions() {
        const lastAction = await this.fundingActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.FUNDING_ADDRESS,
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
            await this.fundingActionModel.findOneAndUpdate(
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

    private async updateFundings() {
        const lastFunding = await this.fundingModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let fundingActions: FundingAction[];
        if (lastFunding != null) {
            fundingActions = await this.fundingActionModel.find(
                { actionId: { $gt: lastFunding.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            fundingActions = await this.fundingActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < fundingActions.length; i++) {
            const fundingAction = fundingActions[i];
            await this.fundingModel.findOneAndUpdate(
                { actionId: fundingAction.actionId },
                getFunding(fundingAction),
                { new: true, upsert: true },
            );
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.FUNDING_ADDRESS,
        );
        let lastActionHash: string = null;
        for (let i = 0; i < rawEvents.length; i++) {
            const event = this.readFundingEvent(rawEvents[i].events[0].data);
            if (event.fundingEventEnum == FundingEventEnum.REQUEST_SENT) {
                await this.fundingResultModel.findOneAndUpdate(
                    {
                        campaignId: event.campaignId,
                    },
                    {
                        campaignId: event.campaignId,
                        requestId: event.requestId,
                        committeeId: event.committeeId,
                        keyId: event.keyId,
                        sumM: event.sumM,
                        sumR: event.sumR,
                    },
                    { new: true, upsert: true },
                );
            } else {
                lastActionHash = event.actionHash;
            }
        }
        if (lastActionHash != null) {
            const lastFundingAction = await this.fundingActionModel.findOne({
                currentActionState: lastActionHash,
            });

            const notActiveFundings = await this.fundingModel.find(
                {
                    actionId: { $lte: lastFundingAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveFundings.length; i++) {
                const notActiveFunding = notActiveFundings[i];
                notActiveFunding.set('active', true);
                await notActiveFunding.save();
            }
        }
    }

    private readFundingEvent(data: string[]): {
        fundingEventEnum: FundingEventEnum;
        actionHash?: string;
        campaignId?: number;
        committeeId?: number;
        keyId?: number;
        requestId?: string;
        sumR?: { x: string; y: string }[];
        sumM?: { x: string; y: string }[];
    } {
        if (Number(data[0]) == FundingEventEnum.ACTIONS_REDUCED) {
            return {
                fundingEventEnum: FundingEventEnum.ACTIONS_REDUCED,
                actionHash: Field(data[1]).toString(),
            };
        } else if (Number(data[0]) == FundingEventEnum.REQUEST_SENT) {
            data = data.slice(1);
            const event = ZkApp.Funding.RequestSent.fromFields(
                Utilities.stringArrayToFields(data),
            );
            const sumR: { x: string; y: string }[] = [];
            const sumM: { x: string; y: string }[] = [];
            for (let i = 0; i < event.sumM.length.toBigInt(); i++) {
                const x = event.sumM.values[i].x.toString();
                const y = event.sumM.values[i].y.toString();
                sumM.push({ x: x, y: y });
            }
            for (let i = 0; i < event.sumR.length.toBigInt(); i++) {
                const x = event.sumR.values[i].x.toString();
                const y = event.sumR.values[i].y.toString();
                sumR.push({ x: x, y: y });
            }
            return {
                fundingEventEnum: FundingEventEnum.REQUEST_SENT,
                campaignId: Number(event.campaignId.toString()),
                committeeId: Number(event.committeeId.toString()),
                keyId: Number(event.keyId.toString()),
                requestId: event.requestId.toString(),
                sumM: sumM,
                sumR: sumR,
            };
        }
    }

    async updateMerkleTrees() {
        try {
            const fundingResults = await this.fundingResultModel.find({});
            for (let i = 0; i < fundingResults.length; i++) {
                const fundingResult = fundingResults[i];
                const level1Index = this._requestId.calculateLevel1Index(
                    Field(fundingResult.campaignId),
                );
                const requestIdLeaf = this._requestId.calculateLeaf(
                    Field(fundingResult.requestId),
                );
                this._requestId.updateLeaf(requestIdLeaf, level1Index);
                const totalR = DkgZkApp.Request.RequestVector.empty();
                fundingResult.sumR.map((dimension, index) => {
                    totalR.set(
                        Field(index),
                        Group.from(dimension.x, dimension.y),
                    );
                });
                const totalM = DkgZkApp.Request.RequestVector.empty();
                fundingResult.sumM.map((dimension, index) => {
                    totalM.set(
                        Field(index),
                        Group.from(dimension.x, dimension.y),
                    );
                });
                const totalRLeaf = this._totalR.calculateLeaf(totalR);
                this._totalR.updateLeaf(totalRLeaf, level1Index);
                const totalMLeaf = this._totalR.calculateLeaf(totalM);
                this._totalM.updateLeaf(totalMLeaf, level1Index);
            }
        } catch (err) {}
    }

    async bruteForceFundingResults() {
        const incompleteFundingResults = await this.fundingResultModel.find({
            result: undefined,
        });
        for (let i = 0; i < incompleteFundingResults.length; i++) {
            const incompleteFundingResult = incompleteFundingResults[i];
            const result: string[] = [];
            for (let j = 0; j < incompleteFundingResult.sumM.length; j++) {
                result.push('0');
            }
            incompleteFundingResult.set('result', result);
            await incompleteFundingResult.save();
        }
    }
}
