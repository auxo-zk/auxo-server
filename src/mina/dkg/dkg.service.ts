import { Injectable } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Reducer } from 'o1js';
import { Model } from 'mongoose';
import { DkgAction } from 'src/schemas/actions/dkg-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Round1Action } from 'src/schemas/actions/round-1-action.schema';
import { Round2Action } from 'src/schemas/actions/round-2-action.schema';

@Injectable()
export class DkgService {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
    ) {}

    async fetch() {}

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
    }

    private async fetchAllRound1Actions() {
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
    }

    private async fetchAllRound2Actions() {
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
    }

    private async updateKeys() {}
}
