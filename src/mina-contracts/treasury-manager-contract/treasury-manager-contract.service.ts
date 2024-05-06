import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    getTreasuryManagerActionData,
    TreasuryManagerAction,
} from 'src/schemas/actions/treasury-manager-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import {
    Bool,
    Field,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    UInt8,
} from 'o1js';
import { Constants, Storage, ZkApp } from '@auxo-dev/platform';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { MaxRetries, zkAppCache } from 'src/constants';
import { Utilities } from '../utilities';
import { TreasuryManagerState } from 'src/interfaces/zkapp-state.interface';
import * as _ from 'lodash';
import { Campaign } from 'src/schemas/campaign.schema';
import { Participation } from 'src/schemas/participation.schema';

@Injectable()
export class TreasuryManagerContractService
    implements ContractServiceInterface
{
    private readonly logger = new Logger(TreasuryManagerContractService.name);
    private readonly _campaignStateStorage: Storage.TreasuryManagerStorage.CampaignStateStorage;
    private readonly _claimedAmountStorage: Storage.TreasuryManagerStorage.ClaimedAmountStorage;
    private readonly _zkAppStorage: Storage.SharedStorage.ZkAppStorage;
    private _actionState: string;

    public get campaignStateStorage(): Storage.TreasuryManagerStorage.CampaignStateStorage {
        return this._campaignStateStorage;
    }
    public get claimedAmountStorage(): Storage.TreasuryManagerStorage.ClaimedAmountStorage {
        return this._claimedAmountStorage;
    }

    public get zkAppStorage(): Storage.SharedStorage.ZkAppStorage {
        return this._zkAppStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(TreasuryManagerAction.name)
        private readonly treasuryManagerActionModel: Model<TreasuryManagerAction>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
    ) {
        this._actionState = '';
        this._campaignStateStorage =
            new Storage.TreasuryManagerStorage.CampaignStateStorage();
        this._claimedAmountStorage =
            new Storage.TreasuryManagerStorage.ClaimedAmountStorage();
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
                await this.fetchTreasuryActions();
                await this.updateTreasuryManagers();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchTreasuryManagerState(): Promise<TreasuryManagerState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.TREASURY_ADDRESS,
        );
        const result: TreasuryManagerState = {
            campaignStateRoot: Field(state[0]),
            claimedIndexRoot: Field(state[1]),
            zkApp: Field(state[2]),
            actionState: Field(state[3]),
        };
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup() {
        try {
            const lastReducedAction =
                await this.treasuryManagerActionModel.findOne(
                    { active: true },
                    {},
                    {
                        sort: {
                            actionId: -1,
                        },
                    },
                );
            const notReducedActions =
                await this.treasuryManagerActionModel.find(
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
                const state = await this.fetchTreasuryManagerState();

                let proof =
                    await ZkApp.TreasuryManager.RollupTreasuryManager.firstStep(
                        state.campaignStateRoot,
                        state.claimedIndexRoot,
                        state.actionState,
                    );
                const campaignStateStorage = _.cloneDeep(
                    this._campaignStateStorage,
                );
                const claimedAmountStorage = _.cloneDeep(
                    this._claimedAmountStorage,
                );

                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    const campaignId = Field(
                        notReducedAction.actionData.campaignId,
                    );
                    if (
                        notReducedAction.actionData.actionType ==
                        Storage.TreasuryManagerStorage.TreasuryManagerActionEnum
                            .COMPLETE_CAMPAIGN
                    ) {
                        proof =
                            await ZkApp.TreasuryManager.RollupTreasuryManager.completeCampaignStep(
                                proof,
                                ZkApp.TreasuryManager.TreasuryManagerAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                campaignStateStorage.getLevel1Witness(
                                    campaignId,
                                ),
                            );
                        campaignStateStorage.updateLeaf(
                            campaignId,
                            campaignStateStorage.calculateLeaf(
                                Storage.TreasuryManagerStorage.CampaignStateEnum
                                    .COMPLETED,
                            ),
                        );
                    } else if (
                        notReducedAction.actionData.actionType ==
                        Storage.TreasuryManagerStorage.TreasuryManagerActionEnum
                            .ABORT_CAMPAIGN
                    ) {
                        proof =
                            await ZkApp.TreasuryManager.RollupTreasuryManager.completeCampaignStep(
                                proof,
                                ZkApp.TreasuryManager.TreasuryManagerAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                campaignStateStorage.getLevel1Witness(
                                    campaignId,
                                ),
                            );
                        campaignStateStorage.updateLeaf(
                            campaignId,
                            campaignStateStorage.calculateLeaf(
                                Storage.TreasuryManagerStorage.CampaignStateEnum
                                    .ABORTED,
                            ),
                        );
                    } else {
                        const level1Index =
                            claimedAmountStorage.calculateLevel1Index({
                                campaignId: campaignId,
                                dimensionIndex: new UInt8(
                                    notReducedAction.actionData.projectIndex -
                                        1,
                                ),
                            });
                        proof =
                            await ZkApp.TreasuryManager.RollupTreasuryManager.claimFundStep(
                                proof,
                                ZkApp.TreasuryManager.TreasuryManagerAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                claimedAmountStorage.getLevel1Witness(
                                    level1Index,
                                ),
                            );
                        claimedAmountStorage.updateLeaf(
                            level1Index,
                            Field(notReducedAction.actionData.amount),
                        );
                    }
                }
                const treasuryContract =
                    new ZkApp.TreasuryManager.TreasuryManagerContract(
                        PublicKey.fromBase58(process.env.TREASURY_ADDRESS),
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
                        await treasuryContract.rollup(proof);
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

    // ===== PRIVATE FUNCTIONS ========

    async fetchTreasuryActions() {
        const lastAction = await this.treasuryManagerActionModel.findOne(
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
            const actionData = getTreasuryManagerActionData(action.actions[0]);
            await this.treasuryManagerActionModel.findOneAndUpdate(
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

    private async updateTreasuryManagers() {
        await this.fetchTreasuryManagerState();
        const currentAction = await this.treasuryManagerActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.treasuryManagerActionModel.find(
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
                    Storage.TreasuryManagerStorage.TreasuryManagerActionEnum
                        .COMPLETE_CAMPAIGN
                ) {
                    promises.push(
                        this.campaignModel.findOneAndUpdate(
                            {
                                campaignId:
                                    notActiveAction.actionData.campaignId,
                            },
                            {
                                state: Storage.TreasuryManagerStorage
                                    .CampaignStateEnum.COMPLETED,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                } else if (
                    notActiveAction.actionData.actionType ==
                    Storage.TreasuryManagerStorage.TreasuryManagerActionEnum
                        .ABORT_CAMPAIGN
                ) {
                    promises.push(
                        this.campaignModel.findOneAndUpdate(
                            {
                                campaignId:
                                    notActiveAction.actionData.campaignId,
                            },
                            {
                                state: Storage.TreasuryManagerStorage
                                    .CampaignStateEnum.ABORTED,
                            },
                            { new: true, upsert: true },
                        ),
                    );
                } else {
                    const participation = await this.participationModel.findOne(
                        {
                            campaignId: notActiveAction.actionData.campaignId,
                            projectIndex:
                                notActiveAction.actionData.projectIndex,
                        },
                    );
                    participation.set(
                        'claimedAmount',
                        notActiveAction.actionData.amount,
                    );
                    promises.push(participation.save());
                }
                await Promise.all(promises);
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const campaigns = await this.campaignModel.find({
                state: {
                    $ne: Storage.TreasuryManagerStorage.CampaignStateEnum
                        .NOT_ENDED,
                },
            });
            for (let i = 0; i < campaigns.length; i++) {
                const campaign = campaigns[i];
                this._campaignStateStorage.updateLeaf(
                    Field(campaign.campaignId),
                    this._campaignStateStorage.calculateLeaf(campaign.state),
                );
                const participations = await this.participationModel.find(
                    {
                        campaignId: campaign.campaignId,
                        claimedAmount: { $gt: 0 },
                    },
                    {},
                    { sort: { projectIndex: 1 } },
                );
                for (let j = 0; j < participations.length; j++) {
                    const participation = participations[j];
                    const level1Index =
                        this._claimedAmountStorage.calculateLevel1Index({
                            campaignId: Field(campaign.campaignId),
                            dimensionIndex: new UInt8(
                                participation.projectIndex - 1,
                            ),
                        });
                    this._claimedAmountStorage.updateLeaf(
                        level1Index,
                        Field(participation.claimedAmount),
                    );
                }
            }
        } catch (err) {}
    }
}
