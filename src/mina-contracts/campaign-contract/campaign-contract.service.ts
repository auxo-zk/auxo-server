import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Provable, PublicKey, Reducer } from 'o1js';
import {
    CampaignAction,
    getRawCampaign,
} from 'src/schemas/actions/campaign-action.schema';
import { RawCampaign } from 'src/schemas/raw-campaign.schema';
import { Campaign } from 'src/schemas/campaign.schema';
import { CampaignActionEnum } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';
import { Constants, Storage } from '@auxo-dev/platform';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';

@Injectable()
export class CampaignContractService implements ContractServiceInterface {
    private readonly _info: Storage.CampaignStorage.InfoStorage;
    private readonly _owner: Storage.CampaignStorage.OwnerStorage;
    private readonly _status: Storage.CampaignStorage.StatusStorage;
    private readonly _config: Storage.CampaignStorage.ConfigStorage;
    private readonly _zkApp: Storage.SharedStorage.AddressStorage;

    public get info(): Storage.CampaignStorage.InfoStorage {
        return this._info;
    }
    public get owner(): Storage.CampaignStorage.OwnerStorage {
        return this._owner;
    }
    public get status(): Storage.CampaignStorage.StatusStorage {
        return this._status;
    }
    public get config(): Storage.CampaignStorage.ConfigStorage {
        return this._config;
    }
    public get zkApp(): Storage.SharedStorage.AddressStorage {
        return this._zkApp;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CampaignAction.name)
        private readonly campaignActionModel: Model<CampaignAction>,
        @InjectModel(RawCampaign.name)
        private readonly rawCampaignModel: Model<RawCampaign>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
    ) {
        this._info = new Storage.CampaignStorage.InfoStorage();
        this._owner = new Storage.CampaignStorage.OwnerStorage();
        this._status = new Storage.CampaignStorage.StatusStorage();
        this._config = new Storage.CampaignStorage.ConfigStorage();
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
            await this.fetchCampaignActions();
            await this.updateRawCampaigns();
            await this.updateCampaigns();
        } catch (err) {}
    }

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
            await this.campaignActionModel.findOneAndUpdate(
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

    private async updateRawCampaigns() {
        const lastRawCampaign = await this.rawCampaignModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let campaignActions: CampaignAction[];
        if (lastRawCampaign != null) {
            campaignActions = await this.campaignActionModel.find(
                { actionId: { $gt: lastRawCampaign.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            campaignActions = await this.campaignActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < campaignActions.length; i++) {
            const campaignAction = campaignActions[i];
            await this.rawCampaignModel.findOneAndUpdate(
                { actionId: campaignAction.actionId },
                getRawCampaign(campaignAction),
                { new: true, upsert: true },
            );
        }
    }

    private async updateCampaigns() {
        const rawCampaigns = await this.rawCampaignModel.find(
            { actionEnum: CampaignActionEnum.CREATE_CAMPAIGN },
            {},
            { sort: { actionId: 1 } },
        );
        const lastCampaign = await this.campaignModel.findOne(
            {},
            {},
            { sort: { campaignId: -1 } },
        );
        for (
            let campaignId = lastCampaign ? lastCampaign.campaignId + 1 : 0;
            campaignId < rawCampaigns.length;
            campaignId++
        ) {
            const rawCampaign = rawCampaigns[campaignId];
            try {
                const ipfsData = await this.ipfs.getData(rawCampaign.ipfsHash);
                await this.campaignModel.create({
                    campaignId: campaignId,
                    ipfsHash: rawCampaign.ipfsHash,
                    owner: rawCampaign.owner,
                    status: rawCampaign.status,
                    committeeId: rawCampaign.committeeId,
                    keyId: rawCampaign.committeeId,
                    ipfsData: ipfsData,
                });
            } catch (err) {
                await this.campaignModel.create({
                    campaignId: campaignId,
                    ipfsHash: rawCampaign.ipfsHash,
                    owner: rawCampaign.owner,
                    status: rawCampaign.status,
                    committeeId: rawCampaign.committeeId,
                    keyId: rawCampaign.committeeId,
                    ipfsData: undefined,
                });
            }
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.CAMPAIGN_ADDRESS,
        );

        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActiveCampaignId = Number(lastEvent[0].data[0]);
            const notActiveCampaigns = await this.campaignModel.find(
                {
                    campaignId: { $lte: lastActiveCampaignId },
                    active: false,
                },
                {},
                { sort: { campaignId: 1 } },
            );
            for (let i = 0; i < notActiveCampaigns.length; i++) {
                const notActiveCampaign = notActiveCampaigns[i];
                notActiveCampaign.set('active', true);
                await notActiveCampaign.save();
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const campaigns = await this.campaignModel.find(
                { active: true },
                {},
                { sort: { campaignId: 1 } },
            );

            for (let i = 0; i < campaigns.length; i++) {
                const campaign = campaigns[i];
                const level1Index = this._info.calculateLevel1Index(
                    Field(campaign.campaignId),
                );
                const infoLeaf = this._info.calculateLeaf(
                    IPFSHash.fromString(campaign.ipfsHash),
                );
                this._info.updateLeaf(infoLeaf, level1Index);
                const ownerLeaf = this._owner.calculateLeaf(
                    PublicKey.fromBase58(campaign.owner),
                );
                this._owner.updateLeaf(ownerLeaf, level1Index);
                const statusLeaf = this._status.calculateLeaf(
                    campaign.status as number,
                );
                this._status.updateLeaf(statusLeaf, level1Index);
                const configLeaf = this._config.calculateLeaf({
                    committeeId: Field(campaign.committeeId),
                    keyId: Field(campaign.keyId),
                });
                this._config.updateLeaf(configLeaf, level1Index);
            }
        } catch (err) {}
    }
}
