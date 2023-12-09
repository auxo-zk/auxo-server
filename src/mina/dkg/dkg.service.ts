import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Reducer } from 'o1js';
import { Model } from 'mongoose';
import { DkgAction, getDkg } from 'src/schemas/actions/dkg-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
    Round1Action,
    getRound1,
} from 'src/schemas/actions/round-1-action.schema';
import {
    Round2Action,
    getRound2,
} from 'src/schemas/actions/round-2-action.schema';
import { Dkg } from 'src/schemas/dkg.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';

@Injectable()
export class DkgService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(Dkg.name)
        private readonly dkgModel: Model<Dkg>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
    ) {}

    async onModuleInit() {
        await this.fetch();
    }

    async fetch() {
        await this.fetchAllActions();
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllActions() {
        await this.fetchAllDkgActions();
        await this.fetchAllRound1Actions();
        await this.fetchAllRound2Actions();
    }

    private async fetchAllDkgActions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.DKG_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field.from(
                actions[actionsLength - 1].hash,
            );
            promises.push(
                this.dkgActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateDkgs();
    }

    private async fetchAllRound1Actions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.ROUND_1_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field.from(
                actions[actionsLength - 1].hash,
            );
            promises.push(
                this.round1ActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateRound1Contribution();
    }

    private async fetchAllRound2Actions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.ROUND_2_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field.from(
                actions[actionsLength - 1].hash,
            );
            console.log(actions[actionsLength - 1].actions[0]);
            promises.push(
                this.round2ActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateRound2Contribution();
    }

    private async updateDkgs() {
        let promises = [];
        const lastDkg = await this.dkgModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let dkgActions: DkgAction[];
        if (lastDkg != null) {
            dkgActions = await this.dkgActionModel.find(
                { actionId: { $gt: lastDkg.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            dkgActions = await this.dkgActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }

        for (let i = 0; i < dkgActions.length; i++) {
            const dkgAction = dkgActions[i];
            promises.push(
                this.dkgModel.findOneAndUpdate(
                    { actionId: dkgAction.actionId },
                    getDkg(dkgAction),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.DKG_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field.from(lastEvent[0].data[0]).toString();
            const lastActiveDkgAction = await this.dkgActionModel.findOne({
                currentActionState: lastActionState,
            });
            const notActiveDkgs = await this.dkgModel.find(
                {
                    actionId: { $lte: lastActiveDkgAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgs.length; i++) {
                const notActiveDkg = notActiveDkgs[i];
                notActiveDkg.set('active', true);
                promises.push(notActiveDkg.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateRound1Contribution() {
        let promises = [];
        const lastRound1Contribution = await this.round1Model.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let round1Actions: Round1Action[];
        if (lastRound1Contribution != null) {
            round1Actions = await this.round1ActionModel.find(
                { actionId: { $gt: lastRound1Contribution.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            round1Actions = await this.round1ActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < round1Actions.length; i++) {
            const round1Action = round1Actions[i];
            promises.push(
                this.round1Model.findOneAndUpdate(
                    { actionId: round1Action.actionId },
                    getRound1(round1Action),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.ROUND_1_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field.from(lastEvent[0].data[0]).toString();
            const lastActiveRound1Action = await this.round1ActionModel.findOne(
                {
                    currentActionState: lastActionState,
                },
            );
            const notActiveRound1Contributions = await this.round1Model.find(
                {
                    actionId: { $lte: lastActiveRound1Action.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveRound1Contributions.length; i++) {
                const notActiveRound1Contribution =
                    notActiveRound1Contributions[i];
                notActiveRound1Contribution.set('active', true);
                promises.push(notActiveRound1Contribution.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateRound2Contribution() {
        let promises = [];
        const lastRound2Contribution = await this.round2Model.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let round2Actions: Round2Action[];
        if (lastRound2Contribution != null) {
            round2Actions = await this.round1ActionModel.find(
                { actionId: { $gt: lastRound2Contribution.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            round2Actions = await this.round2ActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < round2Actions.length; i++) {
            const round2Action = round2Actions[i];
            promises.push(
                this.round2Model.findOneAndUpdate(
                    { actionId: round2Action.actionId },
                    getRound2(round2Action),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.ROUND_2_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field.from(lastEvent[0].data[0]).toString();
            const lastActiveRound2Action = await this.round2ActionModel.findOne(
                {
                    currentActionState: lastActionState,
                },
            );
            const notActiveRound2Contributions = await this.round2Model.find(
                {
                    actionId: { $lte: lastActiveRound2Action.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveRound2Contributions.length; i++) {
                const notActiveRound2Contribution =
                    notActiveRound2Contributions[i];
                notActiveRound2Contribution.set('active', true);
                promises.push(notActiveRound2Contribution.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateKeys() {}
}
