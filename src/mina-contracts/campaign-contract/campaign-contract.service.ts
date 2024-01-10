import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Reducer } from 'o1js';
import {
    CampaignAction,
    getRawCampaign,
} from 'src/schemas/actions/campaign-action.schema';
import { RawCampaign } from 'src/schemas/raw-campaign.schema';
import { Campaign } from 'src/schemas/campaign.schema';
import { CampaignActionEnum } from 'src/constants';
import { Ipfs } from 'src/ipfs/ipfs';

@Injectable()
export class CampaignContractService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CampaignAction.name)
        private readonly campaignActionModel: Model<CampaignAction>,
        @InjectModel(RawCampaign.name)
        private readonly rawCampaignModel: Model<RawCampaign>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
    ) {}

    async onModuleInit() {
        await this.fetch();
    }

    private async fetch() {
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
            await this.campaignModel.create({
                campaignId: campaignId,
                ipfsHash: rawCampaign.ipfsHash,
                owner: rawCampaign.owner,
                status: rawCampaign.status,
                committeeId: rawCampaign.committeeId,
                keyId: rawCampaign.committeeId,
                ipfsData: await this.ipfs.getData(rawCampaign.ipfsHash),
            });
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
}
