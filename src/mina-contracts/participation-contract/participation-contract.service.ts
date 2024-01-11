import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import {
    ParticipationAction,
    getParticipation,
} from 'src/schemas/actions/participation-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Field, Reducer } from 'o1js';
import { Participation } from 'src/schemas/participation.schema';
import { Ipfs } from 'src/ipfs/ipfs';

@Injectable()
export class ParticipationContractService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(ParticipationAction.name)
        private readonly participationActionModel: Model<ParticipationAction>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
    ) {}

    async onModuleInit() {
        await this.fetch();
    }

    private async fetch() {
        try {
            await this.fetchParticipationActions();
            await this.updateParticipations();
        } catch (err) {}
    }

    private async fetchParticipationActions() {
        const lastAction = await this.participationActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.PARTICIPATION_ADDRESS,
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
            await this.participationActionModel.findOneAndUpdate(
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

    private async updateParticipations() {
        const lastParticipation = await this.participationModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let participationActions: ParticipationAction[];
        if (lastParticipation != null) {
            participationActions = await this.participationActionModel.find(
                { actionId: { $gt: lastParticipation.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            participationActions = await this.participationActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < participationActions.length; i++) {
            const participationAction = participationActions[i];
            const participation = getParticipation(participationAction);
            participation.ipfsData = await this.ipfs.getData(
                participation.ipfsHash,
            );
            await this.participationModel.findOneAndUpdate(
                { actionId: participationAction.actionId },
                participation,
                { new: true, upsert: true },
            );
        }

        const rawEvents = await this.queryService.fetchEvents(
            process.env.PARTICIPATION_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveParticipationAction =
                await this.participationActionModel.findOne({
                    currentActionState: lastActionState,
                });
            const notActiveParticipations = await this.participationModel.find(
                {
                    actionId: { $lte: lastActiveParticipationAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveParticipations.length; i++) {
                const notActiveParticipation = notActiveParticipations[i];
                notActiveParticipation.set('active', true);
                await notActiveParticipation.save();
            }
        }
    }
}
