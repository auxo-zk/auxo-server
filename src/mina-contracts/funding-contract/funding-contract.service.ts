import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    FundingAction,
    FundingActionData,
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
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { FundingState } from 'src/interfaces/zkapp-state.interface';
import _ from 'lodash';
import { ParticipationContractService } from '../participation-contract/participation-contract.service';
import { ProjectContractService } from '../project-contract/project-contract.service';
import { CampaignContractService } from '../campaign-contract/campaign-contract.service';
import { Utils } from '@auxo-dev/auxo-libs';

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
        private readonly projectContractService: ProjectContractService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        @InjectModel(FundingAction.name)
        private readonly fundingActionModel: Model<FundingAction>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
    ) {
        this._nextFundingId = 0;
        this._actionState = '';
        this._fundingInformationStorage =
            new Storage.FundingStorage.FundingInformationStorage();
        this._zkAppStorage = Utilities.getZkAppStorageForPlatform();
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            // Provable.log(await this.fetchFundingState());
            // Provable.log(this.fundingInformationStorage.root);
            // await this.projectContractService.compile();
            // await this.campaignContractService.compile();
            // await this.participationContractService.compile();
            // await this.compile();
            // await this.rollup();
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
        await ZkApp.Funding.RollupFunding.compile({ cache });
        await ZkApp.Funding.FundingContract.compile({ cache });
    }

    async fetchFundingState(): Promise<FundingState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.FUNDING_ADDRESS,
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

    async getNextRollupJob(): Promise<string | undefined> {
        try {
            const notActiveActions = await this.fundingActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                return notActiveActions[0].previousActionState;
            }
        } catch (err) {
            console.log(err);
        }
    }

    async processRollupJob(previousActionState: string): Promise<boolean> {
        try {
            const notActiveActions = await this.fundingActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (
                notActiveActions.length == 0 ||
                notActiveActions[0].previousActionState != previousActionState
            )
                throw new Error('Incorrect previous action state!');
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
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                if (
                    notActiveAction.actionData.actionType ==
                    Storage.FundingStorage.FundingActionEnum.FUND
                ) {
                    proof = await Utils.prove(
                        ZkApp.Funding.RollupFunding.name,
                        'fundStep',
                        async () =>
                            ZkApp.Funding.RollupFunding.fundStep(
                                proof,
                                ZkApp.Funding.FundingAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notActiveAction.actions,
                                    ),
                                ),
                                fundingInformationStorage.getLevel1Witness(
                                    nextFundingId,
                                ),
                            ),
                        undefined,
                        { info: true, error: true },
                    );

                    fundingInformationStorage.updateLeaf(
                        nextFundingId,
                        fundingInformationStorage.calculateLeaf(
                            FundingActionData.toFundingInformation(
                                notActiveAction.actionData,
                            ),
                        ),
                    );
                    nextFundingId = nextFundingId.add(1);
                } else {
                    proof = await Utils.prove(
                        ZkApp.Funding.RollupFunding.name,
                        'refundStep',
                        async () =>
                            ZkApp.Funding.RollupFunding.refundStep(
                                proof,
                                ZkApp.Funding.FundingAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notActiveAction.actions,
                                    ),
                                ),
                                fundingInformationStorage.getLevel1Witness(
                                    Field(notActiveAction.actionData.fundingId),
                                ),
                            ),
                        undefined,
                        { info: true, error: true },
                    );

                    fundingInformationStorage.updateLeaf(
                        Field(notActiveAction.actionData.fundingId),
                        fundingInformationStorage.calculateLeaf(
                            FundingActionData.toFundingInformation(
                                notActiveAction.actionData,
                            ),
                        ),
                    );
                }
            }
            const fundingContract = new ZkApp.Funding.FundingContract(
                PublicKey.fromBase58(process.env.FUNDING_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            await Utils.proveAndSendTx(
                ZkApp.Funding.FundingContract.name,
                'rollup',
                async () => fundingContract.rollup(proof),
                {
                    sender: {
                        privateKey: feePayerPrivateKey,
                        publicKey: feePayerPrivateKey.toPublicKey(),
                    },
                    fee: process.env.FEE,
                    memo: '',
                    nonce: await this.queryService.fetchAccountNonce(
                        feePayerPrivateKey.toPublicKey().toBase58(),
                    ),
                },
                undefined,
                undefined,
                { info: true, error: true, memoryUsage: false },
            );
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
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
                let proof = await Utils.prove(
                    ZkApp.Funding.RollupFunding.name,
                    'firstStep',
                    async () =>
                        ZkApp.Funding.RollupFunding.firstStep(
                            state.nextFundingId,
                            state.fundingInformationRoot,
                            state.actionState,
                        ),
                    undefined,
                    { info: true, error: true },
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
                        proof = await Utils.prove(
                            ZkApp.Funding.RollupFunding.name,
                            'fundStep',
                            async () =>
                                ZkApp.Funding.RollupFunding.fundStep(
                                    proof,
                                    ZkApp.Funding.FundingAction.fromFields(
                                        Utilities.stringArrayToFields(
                                            notReducedAction.actions,
                                        ),
                                    ),
                                    fundingInformationStorage.getLevel1Witness(
                                        nextFundingId,
                                    ),
                                ),
                            undefined,
                            { info: true, error: true },
                        );
                        fundingInformationStorage.updateLeaf(
                            nextFundingId,
                            fundingInformationStorage.calculateLeaf(
                                FundingActionData.toFundingInformation(
                                    notReducedAction.actionData,
                                ),
                            ),
                        );
                        nextFundingId = nextFundingId.add(1);
                    } else {
                        proof = await Utils.prove(
                            ZkApp.Funding.RollupFunding.name,
                            'fundStep',
                            async () =>
                                ZkApp.Funding.RollupFunding.fundStep(
                                    proof,
                                    ZkApp.Funding.FundingAction.fromFields(
                                        Utilities.stringArrayToFields(
                                            notReducedAction.actions,
                                        ),
                                    ),
                                    fundingInformationStorage.getLevel1Witness(
                                        Field(
                                            notReducedAction.actionData
                                                .fundingId,
                                        ),
                                    ),
                                ),
                            undefined,
                            { info: true, error: true },
                        );
                        fundingInformationStorage.updateLeaf(
                            Field(notReducedAction.actionData.fundingId),
                            fundingInformationStorage.calculateLeaf(
                                FundingActionData.toFundingInformation(
                                    notReducedAction.actionData,
                                ),
                            ),
                        );
                    }
                }
                const fundingContract = new ZkApp.Funding.FundingContract(
                    PublicKey.fromBase58(process.env.FUNDING_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                // Provable.log(proof.publicOutput);
                await Utils.proveAndSendTx(
                    ZkApp.Funding.FundingContract.name,
                    'rollup',
                    async () => fundingContract.rollup(proof),
                    {
                        sender: {
                            privateKey: feePayerPrivateKey,
                            publicKey: feePayerPrivateKey.toPublicKey(),
                        },
                        fee: process.env.FEE,
                        memo: '',
                        nonce: await this.queryService.fetchAccountNonce(
                            feePayerPrivateKey.toPublicKey().toBase58(),
                        ),
                    },
                    undefined,
                    undefined,
                    { info: true, error: true, memoryUsage: false },
                );
                return true;
            }
            return false;
        } catch (err) {
            // this.logger.error(err);
            console.log(err);
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
            const lastFunding = await this.fundingModel.findOne(
                {},
                {},
                { sort: { fundingId: -1 } },
            );
            let nextFundingId = lastFunding ? lastFunding.fundingId + 1 : 0;
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
                                fundingId: nextFundingId,
                            },
                            {
                                fundingId: nextFundingId,
                                campaignId:
                                    notActiveAction.actionData.campaignId,
                                investor: notActiveAction.actionData.investor,
                                amount: notActiveAction.actionData.amount,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                    nextFundingId += 1;
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
                        Funding.toFundingInformation(funding),
                    );
                this._fundingInformationStorage.updateLeaf(
                    level1Index,
                    fundingInformationLeaf,
                );
            }
        } catch (err) {
            console.log(err);
        }
    }
}
