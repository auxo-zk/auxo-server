import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import {
    Field,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    UInt64,
} from 'o1js';
import {
    CampaignAction,
    getCampaignActionData,
} from 'src/schemas/actions/campaign-action.schema';
import { Campaign } from 'src/schemas/campaign.schema';
import { MaxRetries, zkAppCache } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';
import { Constants, Storage, ZkApp } from '@auxo-dev/platform';
import { IpfsHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { Utilities } from '../utilities';
import { CampaignState } from 'src/interfaces/zkapp-state.interface';
import * as _ from 'lodash';

@Injectable()
export class CampaignContractService implements ContractServiceInterface {
    private readonly logger = new Logger(CampaignContractService.name);
    private _nextCampaignId: number;
    private readonly _timelineStorage: Storage.CampaignStorage.TimelineStorage;
    private readonly _ipfsHashStorage: Storage.CampaignStorage.IpfsHashStorage;
    private readonly _keyIndexStorage: Storage.CampaignStorage.KeyIndexStorage;
    private readonly _zkAppStorage: Storage.SharedStorage.ZkAppStorage;
    private _actionState: string;

    public get nextCampaignId(): number {
        return this._nextCampaignId;
    }
    public get timelineStorage(): Storage.CampaignStorage.TimelineStorage {
        return this._timelineStorage;
    }
    public get ipfsHashStorage(): Storage.CampaignStorage.IpfsHashStorage {
        return this._ipfsHashStorage;
    }
    public get keyIndexStorage(): Storage.CampaignStorage.KeyIndexStorage {
        return this._keyIndexStorage;
    }
    public get zkAppStorage(): Storage.SharedStorage.ZkAppStorage {
        return this._zkAppStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CampaignAction.name)
        private readonly campaignActionModel: Model<CampaignAction>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
    ) {
        this._nextCampaignId = 0;
        this._actionState = '';
        this._timelineStorage = new Storage.CampaignStorage.TimelineStorage();
        this._ipfsHashStorage = new Storage.CampaignStorage.IpfsHashStorage();
        this._keyIndexStorage = new Storage.CampaignStorage.KeyIndexStorage();
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
                await this.fetchCampaignActions();
                await this.updateCampaignActions();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(
            ZkApp.Campaign.RollupCampaign,
            cache,
            this.logger,
        );
        await Utilities.compile(
            ZkApp.Campaign.CampaignContract,
            cache,
            this.logger,
        );
    }

    async fetchCampaignState(): Promise<CampaignState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.CAMPAIGN_ADDRESS,
        );
        const result: CampaignState = {
            nextCampaignId: Field(state[0]),
            timelineRoot: Field(state[1]),
            ipfsHashRoot: Field(state[2]),
            keyIndexRoot: Field(state[3]),
            zkAppRoot: Field(state[4]),
            actionState: Field(state[5]),
        };
        this._nextCampaignId = Number(result.nextCampaignId.toBigInt());
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup() {
        const lastReducedAction = await this.campaignActionModel.findOne(
            { active: true },
            {},
            {
                sort: {
                    actionId: -1,
                },
            },
        );
        const notReducedActions = await this.campaignActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const state = await this.fetchCampaignState();
            const timelineStorage = _.cloneDeep(this._timelineStorage);
            const ipfsHashStorage = _.cloneDeep(this._ipfsHashStorage);
            const keyIndexStorage = _.cloneDeep(this._keyIndexStorage);
            let nextCampaignId = state.nextCampaignId;
            const proof = await ZkApp.Campaign.RollupCampaign.firstStep(
                nextCampaignId,
                state.timelineRoot,
                state.ipfsHashRoot,
                state.keyIndexRoot,
                state.actionState,
            );

            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                await ZkApp.Campaign.RollupCampaign.createCampaignStep(
                    proof,
                    ZkApp.Campaign.CampaignAction.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    timelineStorage.getLevel1Witness(nextCampaignId),
                    ipfsHashStorage.getLevel1Witness(nextCampaignId),
                    keyIndexStorage.getLevel1Witness(nextCampaignId),
                );

                timelineStorage.updateLeaf(
                    nextCampaignId,
                    timelineStorage.calculateLeaf(
                        notReducedAction.actionData.timeline.toAction(),
                    ),
                );
                ipfsHashStorage.updateLeaf(
                    nextCampaignId,
                    ipfsHashStorage.calculateLeaf(
                        IpfsHash.fromString(
                            notReducedAction.actionData.ipfsHash,
                        ),
                    ),
                );
                keyIndexStorage.updateLeaf(
                    nextCampaignId,
                    keyIndexStorage.calculateLeaf({
                        committeeId: Field(
                            notReducedAction.actionData.committeeId,
                        ),
                        keyId: Field(notReducedAction.actionData.keyId),
                    }),
                );
                nextCampaignId = nextCampaignId.add(1);
            }
            const campaignContract = new ZkApp.Campaign.CampaignContract(
                PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
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
                    await campaignContract.rollup(proof);
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
    }

    // ====== PRIVATE FUNCTIONS =======

    private async fetchCampaignActions() {
        const lastAction = await this.campaignActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.CAMPAIGN_ADDRESS,
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
            const actionData = getCampaignActionData(action.actions[0]);
            await this.campaignActionModel.findOneAndUpdate(
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

    private async updateCampaignActions() {
        await this.fetchCampaignState();
        const currentAction = await this.campaignActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.campaignActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );

            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                const ipfsData = await this.ipfs.getData(
                    notActiveAction.actionData.ipfsHash,
                );
                await Promise.all([
                    notActiveAction.save(),
                    this.campaignModel.findOneAndUpdate(
                        {
                            campaignId: this._nextCampaignId,
                        },
                        {
                            campaignId: this._nextCampaignId,
                            ipfsHash: notActiveAction.actionData.ipfsHash,
                            ipfsData: ipfsData,
                            owner: notActiveAction.actionData.owner,
                            timeline: notActiveAction.actionData.timeline,
                            committeeId: notActiveAction.actionData.committeeId,
                            keyId: notActiveAction.actionData.keyId,
                        },
                        { new: true, upsert: true },
                    ),
                ]);
                this._nextCampaignId += 1;
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const campaigns = await this.campaignModel.find(
                {},
                {},
                { sort: { campaignId: 1 } },
            );

            for (let i = 0; i < campaigns.length; i++) {
                const campaign = campaigns[i];
                const level1Index = this._timelineStorage.calculateLevel1Index(
                    Field(campaign.campaignId),
                );
                const timelineLeaf = this._timelineStorage.calculateLeaf(
                    campaign.timeline.toAction(),
                );
                this._timelineStorage.updateLeaf(level1Index, timelineLeaf);
                const ipfsHashLeaf = this._ipfsHashStorage.calculateLeaf(
                    IpfsHash.fromString(campaign.ipfsHash),
                );
                this._ipfsHashStorage.updateLeaf(level1Index, ipfsHashLeaf);
                const keyIndexLeaf = this._keyIndexStorage.calculateLeaf({
                    committeeId: Field(campaign.committeeId),
                    keyId: Field(campaign.keyId),
                });
                this._keyIndexStorage.updateLeaf(level1Index, keyIndexLeaf);
            }
        } catch (err) {}
    }
}
