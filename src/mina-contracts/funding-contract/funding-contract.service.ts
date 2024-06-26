import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    FundingAction,
    getFundingActionData,
} from 'src/schemas/actions/funding-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import {
    Field,
    Group,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { Funding } from 'src/schemas/funding.schema';
import {
    ActionReduceStatusEnum,
    FundingEventEnum,
    FundingStateEnum,
    MaxRetries,
    ZkAppCache,
} from 'src/constants';
import { Constants, Storage, ZkApp } from '@auxo-dev/platform';
import { ZkApp as DkgZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { FundingResult } from 'src/schemas/funding-result.schema';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { FundingState } from 'src/interfaces/zkapp-state.interface';
import _ from 'lodash';

@Injectable()
export class FundingContractService implements ContractServiceInterface {
    private readonly logger = new Logger(FundingContractService.name);
    private _nextFundingId: number;
    private readonly _fundingInformationStorage: Storage.FundingStorage.FundingInformationStorage;
    private readonly _zkAppStorage: Storage.SharedStorage.ZkAppStorage;
    private _actionState: string;

    public get nextFundingId(): number {
        return this._nextFundingId;
    }

    public get fundingInformationStorage(): Storage.FundingStorage.FundingInformationStorage {
        return this._fundingInformationStorage;
    }

    public get zkAppStorage(): Storage.SharedStorage.ZkAppStorage {
        return this._zkAppStorage;
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
        this._nextFundingId = 0;
        this._actionState = '';
        this._fundingInformationStorage =
            new Storage.FundingStorage.FundingInformationStorage();
        this._zkAppStorage = Utilities.getZkAppStorageForPlatform();
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
                await this.fetchFundingActions();
                await this.updateFundings();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = ZkAppCache;
    }

    async fetchFundingState(): Promise<FundingState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.FUNDING_CONTRACT,
        );
        const result: FundingState = {
            nextFundingId: Field(state[0]),
            fundingInformationRoot: Field(state[1]),
            zkAppRoot: Field(state[2]),
            actionState: Field(state[3]),
        };
        this._nextFundingId = Number(result.nextFundingId);
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup(): Promise<boolean> {
        try {
            const lastReducedAction = await this.fundingActionModel.findOne(
                { active: true },
                {},
                {
                    sort: {
                        actionId: -1,
                    },
                },
            );
            const notReducedActions = await this.fundingActionModel.find(
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
                const state = await this.fetchFundingState();
                let nextFundingId = state.nextFundingId;
                let proof = await ZkApp.Funding.RollupFunding.firstStep(
                    state.nextFundingId,
                    state.fundingInformationRoot,
                    state.actionState,
                );
                const fundingInformationStorage = _.cloneDeep(
                    this._fundingInformationStorage,
                );
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    if (
                        notReducedAction.actionData.actionType ==
                        Storage.FundingStorage.FundingActionEnum.FUND
                    ) {
                        proof = await ZkApp.Funding.RollupFunding.fundStep(
                            proof,
                            ZkApp.Funding.FundingAction.fromFields(
                                Utilities.stringArrayToFields(
                                    notReducedAction.actions,
                                ),
                            ),
                            fundingInformationStorage.getLevel1Witness(
                                nextFundingId,
                            ),
                        );
                        fundingInformationStorage.updateLeaf(
                            nextFundingId,
                            fundingInformationStorage.calculateLeaf(
                                notReducedAction.actionData.toFundingInformation(),
                            ),
                        );
                        nextFundingId = nextFundingId.add(1);
                    } else {
                        proof = await ZkApp.Funding.RollupFunding.fundStep(
                            proof,
                            ZkApp.Funding.FundingAction.fromFields(
                                Utilities.stringArrayToFields(
                                    notReducedAction.actions,
                                ),
                            ),
                            fundingInformationStorage.getLevel1Witness(
                                Field(notReducedAction.actionData.fundingId),
                            ),
                        );
                        fundingInformationStorage.updateLeaf(
                            Field(notReducedAction.actionData.fundingId),
                            fundingInformationStorage.calculateLeaf(
                                notReducedAction.actionData.toFundingInformation(),
                            ),
                        );
                    }
                }
                const fundingContract = new ZkApp.Funding.FundingContract(
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
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
                        await fundingContract.rollup(proof);
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

    // ======== PRIVATE FUNCTIONS ===========

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
            const actionData = getFundingActionData(action.actions[0]);
            await this.fundingActionModel.findOneAndUpdate(
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

    private async updateFundings() {
        await this.fetchFundingState();
        const currentAction = await this.fundingActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.fundingActionModel.find(
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
                    Storage.FundingStorage.FundingActionEnum.FUND
                ) {
                    promises.push(
                        this.fundingModel.findOneAndUpdate(
                            {
                                fundingId: this._nextFundingId,
                            },
                            {
                                fundingId: this._nextFundingId,
                                campaignId:
                                    notActiveAction.actionData.campaignId,
                                investor: notActiveAction.actionData.investor,
                                amount: notActiveAction.actionData.amount,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                    this._nextFundingId += 1;
                } else {
                    promises.push(
                        this.fundingModel.findOneAndUpdate(
                            {
                                fundingId: notActiveAction.actionData.fundingId,
                            },
                            {
                                state: FundingStateEnum.REFUNDED,
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
            const fundings = await this.fundingModel.find({});
            for (let i = 0; i < fundings.length; i++) {
                const funding = fundings[i];
                const level1Index =
                    this._fundingInformationStorage.calculateLevel1Index(
                        Field(funding.fundingId),
                    );
                const fundingInformationLeaf =
                    this._fundingInformationStorage.calculateLeaf(
                        funding.toFundingInformation(),
                    );
                this._fundingInformationStorage.updateLeaf(
                    level1Index,
                    fundingInformationLeaf,
                );
            }
        } catch (err) {}
    }
}
