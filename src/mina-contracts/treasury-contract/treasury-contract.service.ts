import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    TreasuryAction,
    getTreasury,
} from 'src/schemas/actions/treasury-action.schema';
import { Model } from 'mongoose';
import { Treasury } from 'src/schemas/treasury.schema';
import { Action } from 'src/interfaces/action.interface';
import {
    Bool,
    Field,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import {
    ClaimFund,
    Constants,
    Storage,
    TreasuryContract,
    ZkApp,
} from '@auxo-dev/platform';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { MaxRetries, zkAppCache } from 'src/constants';
import { Utilities } from '../utilities';
import { TreasuryState } from 'src/interfaces/zkapp-state.interface';

@Injectable()
export class TreasuryContractService implements ContractServiceInterface {
    private readonly logger = new Logger(TreasuryContractService.name);
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
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchTreasuryActions();
                await this.updateTreasuries();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(ClaimFund, cache, this.logger);
        await Utilities.compile(TreasuryContract, cache, this.logger);
    }

    async fetchTreasuryState(): Promise<TreasuryState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.TREASURY_ADDRESS,
        );
        return {
            claimed: Field(state[0]),
            zkApp: Field(state[1]),
            actionState: Field(state[2]),
        };
    }

    async rollup() {
        try {
            const lastActiveTreasury = await this.treasuryModel.findOne(
                {
                    active: true,
                },
                {},
                { sort: { actionId: -1 } },
            );
            const lastReducedAction = lastActiveTreasury
                ? await this.treasuryActionModel.findOne({
                      actionId: lastActiveTreasury.actionId,
                  })
                : undefined;
            const notReducedActions = await this.treasuryActionModel.find(
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
                const treasuryState = await this.fetchTreasuryState();
                const notActiveTreasuries = await this.treasuryModel.find(
                    {
                        actionId: {
                            $gt: lastReducedAction
                                ? lastReducedAction.actionId
                                : -1,
                        },
                    },
                    {},
                    {
                        sort: {
                            actionId: 1,
                        },
                    },
                );
                let proof = await ClaimFund.firstStep(
                    treasuryState.claimed,
                    treasuryState.actionState,
                );
                const claimed = await this._claimed;
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    const notActiveTreasury = notActiveTreasuries[i];
                    proof = await ClaimFund.nextStep(
                        proof,
                        ZkApp.Treasury.TreasuryAction.fromFields(
                            Utilities.stringArrayToFields(
                                notReducedAction.actions,
                            ),
                        ),
                        claimed.getWitness(
                            claimed.calculateLevel1Index({
                                campaignId: Field(notActiveTreasury.campaignId),
                                projectId: Field(notActiveTreasury.projectId),
                            }),
                        ),
                    );
                    claimed.updateLeaf(
                        claimed.calculateLevel1Index({
                            campaignId: Field(notActiveTreasury.campaignId),
                            projectId: Field(notActiveTreasury.projectId),
                        }),
                        claimed.calculateLeaf(Bool(true)),
                    );
                }
                const treasuryContract = new TreasuryContract(
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
                    () => {
                        treasuryContract.rollup(proof);
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

    private async updateTreasuries() {
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
                        this._claimed.calculateLevel1Index({
                            campaignId: Field(campaignId),
                            projectId: Field(projectId),
                        }),
                        this._claimed.calculateLeaf(Bool(true)),
                    );
                }
            }
        } catch (err) {}
    }
}
