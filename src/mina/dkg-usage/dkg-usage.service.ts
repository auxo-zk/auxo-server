import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RequestAction,
    getDkgRequest,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import { Field, Reducer } from 'o1js';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class DkgUsageService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
    ) {}
    async onModuleInit() {
        await this.fetch();
    }

    async fetch() {
        await this.fetchAllRequestActions();
    }

    private async fetchAllRequestActions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.REQUEST_ADDRESS,
        );
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionId < actions.length) {
            const currentActionState = Field(actions[actionId].hash);
            promises.push(
                this.requestActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionId].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateDkgRequests();
    }

    private async updateDkgRequests() {
        let promises = [];
        const lastDkgRequest = await this.dkgRequestModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let requestActions: RequestAction[];
        if (lastDkgRequest != null) {
            requestActions = await this.requestActionModel.find(
                { actionId: { $gt: lastDkgRequest.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            requestActions = await this.requestActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < requestActions.length; i++) {
            const requestAction = requestActions[i];
            promises.push(
                this.dkgRequestModel.findOneAndUpdate(
                    { actionId: requestAction.actionId },
                    getDkgRequest(requestAction),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.REQUEST_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveRequestAction =
                await this.requestActionModel.findOne({
                    currentActionState: lastActionState,
                });
            const notActiveDkgRequests = await this.dkgRequestModel.find(
                {
                    actionId: { $lte: lastActiveRequestAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgRequests.length; i++) {
                const notActiveDkgRequest = notActiveDkgRequests[i];
                notActiveDkgRequest.set('active', true);
                promises.push(notActiveDkgRequest.save());
            }
            await Promise.all(promises);
        }
    }
}
