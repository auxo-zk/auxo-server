import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel, raw } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RequestAction,
    getDkgRequest,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import { Field, Reducer } from 'o1js';
import { DkgRequest } from 'src/schemas/request.schema';
import {
    ResponseAction,
    getDkgResponse,
} from 'src/schemas/actions/response-action.schema';
import { DkgResponse } from 'src/schemas/response.schema';
import { RequestActionEnum } from 'src/constants';
import { Event } from 'src/interfaces/event.interface';

@Injectable()
export class DkgUsageService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(ResponseAction.name)
        private readonly responseActionModel: Model<ResponseAction>,
        @InjectModel(DkgResponse.name)
        private readonly dkgResponseModel: Model<DkgResponse>,
    ) {}
    async onModuleInit() {
        await this.fetch();
    }

    async fetch() {
        await this.fetchAllRequestActions();
        await this.fetchAllResponseActions();
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
        for (let i = 0; i < rawEvents.length; i++) {
            const event = this.readRequestEvent(rawEvents[i].events[0].data);
            if (event != null) {
                const dkgRequests = await this.dkgRequestModel.find({
                    requestId: event.requestId,
                    committeeId: undefined,
                    keyId: undefined,
                });
                for (let j = 0; j < dkgRequests.length; j++) {
                    const dkgRequest = dkgRequests[j];
                    dkgRequest.set('committeeId', event.committeeId);
                    dkgRequest.set('keyId', event.keyId);
                    await dkgRequest.save();
                }
            }
        }
        const lastActionHash = this.getLastRequestActionHash(rawEvents);
        if (lastActionHash != null) {
            const lastRequestAction = await this.requestActionModel.findOne({
                currentActionState: lastActionHash,
            });

            const notActiveDkgRequests = await this.dkgRequestModel.find(
                {
                    actionId: { $lte: lastRequestAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgRequests.length; i++) {
                const notActiveDkgRequest = notActiveDkgRequests[i];
                notActiveDkgRequest.set('active', true);
                await notActiveDkgRequest.save();
            }
        }
    }

    private async fetchAllResponseActions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.RESPONSE_ADDRESS,
        );
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionId < actions.length) {
            const currentActionState = Field(actions[actionId].hash);
            promises.push(
                this.responseActionModel.findOneAndUpdate(
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
        await this.updateDkgResponse();
    }

    private async updateDkgResponse() {
        let promises = [];
        const lastDkgResponse = await this.dkgResponseModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let responseActions: ResponseAction[];
        if (lastDkgResponse != null) {
            responseActions = await this.responseActionModel.find(
                { actionId: { $gt: lastDkgResponse.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            responseActions = await this.responseActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < responseActions.length; i++) {
            const responseAction = responseActions[i];
            promises.push(
                this.dkgResponseModel.findOneAndUpdate(
                    { actionId: responseAction.actionId },
                    getDkgResponse(responseAction),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.RESPONSE_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveResponseAction =
                await this.responseActionModel.findOne({
                    currentActionState: lastActionState,
                });
            const notActiveDkgResponses = await this.dkgResponseModel.find(
                {
                    actionId: { $lte: lastActiveResponseAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgResponses.length; i++) {
                const notActiveDkgResponse = notActiveDkgResponses[i];
                notActiveDkgResponse.set('active', true);
                promises.push(notActiveDkgResponse.save());
            }
            await Promise.all(promises);
        }
    }

    private readRequestEvent(data: string[]): {
        requestId: string;
        committeeId: number;
        keyId: number;
    } {
        const actionHash = Field(data[data.length - 1]).toString();
        if (actionHash == '0') {
            const requestId = Field(data[0]).toString();
            const committeeId = Number(Field(data[1]).toString());
            const keyId = Number(Field(data[2]).toString());
            return {
                requestId: requestId,
                committeeId: committeeId,
                keyId: keyId,
            };
        }
        return null;
    }

    private getLastRequestActionHash(rawEvents: Event[]): string {
        let index = rawEvents.length - 1;
        while (index >= 0) {
            const rawEvent = rawEvents[index];
            const data = rawEvent.events[0].data;
            const actionHash = Field(data[data.length - 1]).toString();
            if (actionHash != '0') {
                return actionHash;
            }
            index -= 1;
        }
        return null;
    }
}
