import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel, raw } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RequestAction,
    getDkgRequest,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import { Field, Reducer } from 'o1js';
import { DkgRequestRaw } from 'src/schemas/request-raw.schema';
import {
    ResponseAction,
    getDkgResponse,
} from 'src/schemas/actions/response-action.schema';
import { DkgResponse } from 'src/schemas/response.schema';
import {
    RequestActionEnum,
    RequestEventEnum,
    RequestStatus,
} from 'src/constants';
import { Event } from 'src/interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class DkgUsageService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(DkgRequestRaw.name)
        private readonly dkgRequestRawModel: Model<DkgRequestRaw>,
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
        const lastAction = await this.requestActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.REQUEST_ADDRESS,
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
            await this.requestActionModel.findOneAndUpdate(
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
        await this.updateDkgRequestRaws();
        await this.updateDkgRequests();
    }

    private async updateDkgRequestRaws() {
        let promises = [];
        const lastDkgRequestRaw = await this.dkgRequestRawModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let requestActions: RequestAction[];
        if (lastDkgRequestRaw != null) {
            requestActions = await this.requestActionModel.find(
                { actionId: { $gt: lastDkgRequestRaw.actionId } },
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
                this.dkgRequestRawModel.findOneAndUpdate(
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
        let lastActionHash: string = null;
        for (let i = 0; i < rawEvents.length; i++) {
            const event = this.readRequestEvent(rawEvents[i].events[0].data);
            if (event.requestEventEnum == RequestEventEnum.CREATE_REQUEST) {
                const dkgRequestRaws = await this.dkgRequestRawModel.find({
                    requestId: event.requestId,
                    committeeId: undefined,
                    keyId: undefined,
                });
                for (let j = 0; j < dkgRequestRaws.length; j++) {
                    const dkgRequestRaw = dkgRequestRaws[j];
                    dkgRequestRaw.set('committeeId', event.committeeId);
                    dkgRequestRaw.set('keyId', event.keyId);
                    await dkgRequestRaw.save();
                }
            } else {
                lastActionHash = event.actionHash;
            }
        }
        if (lastActionHash != null) {
            const lastRequestAction = await this.requestActionModel.findOne({
                currentActionState: lastActionHash,
            });

            const notActiveDkgRequestRaws = await this.dkgRequestRawModel.find(
                {
                    actionId: { $lte: lastRequestAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgRequestRaws.length; i++) {
                const notActiveDkgRequestRaw = notActiveDkgRequestRaws[i];
                notActiveDkgRequestRaw.set('active', true);
                await notActiveDkgRequestRaw.save();
            }
        }
    }

    private async updateDkgRequests() {
        const existedRequestIds = await this.dkgRequestModel
            .find({})
            .distinct('requestId');
        const notExistedRequestIds = await this.dkgRequestRawModel
            .find({ requestId: { $nin: existedRequestIds } })
            .distinct('requestId');
        for (let i = 0; i < notExistedRequestIds.length; i++) {
            await this.dkgRequestModel.create({
                requestId: notExistedRequestIds[i],
            });
        }
        const notResolvedDkgRequests = await this.dkgRequestModel.find({
            status: { $ne: RequestStatus.RESOLVED },
        });
        for (let i = 0; i < notResolvedDkgRequests.length; i++) {
            const notResolvedDkgRequest = notResolvedDkgRequests[i];
            if (
                notResolvedDkgRequest.status == RequestStatus.NOT_YET_REQUESTED
            ) {
                const dkgRequestRaw = await this.dkgRequestRawModel.findOne({
                    requestId: notResolvedDkgRequest.requestId,
                    actionEnum: RequestActionEnum.REQUEST,
                });
                if (dkgRequestRaw) {
                    notResolvedDkgRequest.set(
                        'committeeId',
                        dkgRequestRaw.committeeId,
                    );
                    notResolvedDkgRequest.set('keyId', dkgRequestRaw.keyId);
                    notResolvedDkgRequest.set(
                        'requester',
                        dkgRequestRaw.requester,
                    );
                    notResolvedDkgRequest.set('R', dkgRequestRaw.R);
                    notResolvedDkgRequest.set(
                        'status',
                        RequestStatus.REQUESTING,
                    );
                }
            }
            if (notResolvedDkgRequest.status == RequestStatus.REQUESTING) {
                const dkgRequestRaw = await this.dkgRequestRawModel.findOne({
                    requestId: notResolvedDkgRequest.requestId,
                    actionEnum: RequestActionEnum.RESOLVE,
                });
                if (dkgRequestRaw) {
                    notResolvedDkgRequest.set('D', dkgRequestRaw.D);
                    notResolvedDkgRequest.set('status', RequestStatus.RESOLVED);
                }
            }

            await notResolvedDkgRequest.save();
        }
    }

    private async fetchAllResponseActions() {
        const lastAction = await this.responseActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.RESPONSE_ADDRESS,
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
            await this.responseActionModel.findOneAndUpdate(
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
        requestEventEnum: RequestEventEnum;
        requestId?: string;
        committeeId?: number;
        keyId?: number;
        actionHash?: string;
    } {
        if (Number(data[0]) == RequestEventEnum.CREATE_REQUEST) {
            const requestId = Field(data[1]).toString();
            const committeeId = Number(Field(data[2]).toString());
            const keyId = Number(Field(data[3]).toString());
            return {
                requestEventEnum: RequestEventEnum.CREATE_REQUEST,
                requestId: requestId,
                committeeId: committeeId,
                keyId: keyId,
            };
        } else {
            const actionHash = Field(data[1]).toString();
            return {
                requestEventEnum: RequestEventEnum.ACTION_REDUCED,
                actionHash: actionHash,
            };
        }
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
