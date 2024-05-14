import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel, raw } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
    RequestAction,
    getRequestActionData,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import {
    fetchLastBlock,
    Field,
    Group,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    UInt64,
    UInt8,
} from 'o1js';
import {
    getResponseActionData,
    ResponseAction,
} from 'src/schemas/actions/response-action.schema';
import {
    ActionReduceStatusEnum,
    EventEnum,
    MaxRetries,
    RequestActionEnum,
    RequestEventEnum,
    RequestStatusEnum,
    ZkAppIndex,
    zkAppCache,
} from 'src/constants';
import { Event } from 'src/interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';
import {
    Constants,
    DArray,
    FinalizedEvent,
    GroupVectorStorage,
    ResponseContribution,
    ResponseContributionStorage,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import {
    DkgRequestState,
    DkgResponseState,
} from 'src/interfaces/zkapp-state.interface';
import { Utilities } from '../utilities';
import { Committee } from 'src/schemas/committee.schema';
import { DkgContractsService } from '../dkg-contracts/dkg-contracts.service';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import * as _ from 'lodash';
import { RollupAction } from 'src/schemas/actions/rollup-action.schema';
import {
    ResponseProcessedEvent,
    ResponseFinalizedEvent,
    ResponseRespondedEvent,
    getResponseProcessedEventData,
    getResponseFinalizedEventData,
    getResponseRespondedEventData,
} from 'src/schemas/actions/response-event.schema';
import {
    getRequestEventData,
    RequestEvent,
} from 'src/schemas/actions/request-event.schema';

@Injectable()
export class DkgUsageContractsService implements ContractServiceInterface {
    private logger = new Logger(DkgUsageContractsService.name);

    private _dkgRequest: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        requesterCounter: number;
        keyIndexStorage: Storage.RequestStorage.RequestKeyIndexStorage;
        taskIdStorage: Storage.RequestStorage.TaskStorage;
        accumulationStorage: Storage.RequestStorage.RequestAccumulationStorage;
        expirationStorage: Storage.RequestStorage.ExpirationStorage;
        resultStorage: Storage.RequestStorage.ResultStorage;
        actionState: string;
    };

    private _dkgResponse: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.ResponseContributionStorage;
        responseStorage: Storage.DKGStorage.ResponseStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    };

    public get dkgRequest(): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        requesterCounter: number;
        keyIndexStorage: Storage.RequestStorage.RequestKeyIndexStorage;
        taskIdStorage: Storage.RequestStorage.TaskStorage;
        accumulationStorage: Storage.RequestStorage.RequestAccumulationStorage;
        expirationStorage: Storage.RequestStorage.ExpirationStorage;
        resultStorage: Storage.RequestStorage.ResultStorage;
        actionState: string;
    } {
        return this._dkgRequest;
    }

    public get dkgResponse(): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.ResponseContributionStorage;
        responseStorage: Storage.DKGStorage.ResponseStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    } {
        return this._dkgResponse;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly committeeContractService: CommitteeContractService,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(RequestEvent.name)
        private readonly requestEventModel: Model<RequestEvent>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(ResponseAction.name)
        private readonly responseActionModel: Model<ResponseAction>,
        @InjectModel(ResponseProcessedEvent.name)
        private readonly responseProcessedEventModel: Model<ResponseProcessedEvent>,
        @InjectModel(ResponseFinalizedEvent.name)
        private readonly responseFinalizedEventModel: Model<ResponseFinalizedEvent>,
        @InjectModel(ResponseRespondedEvent.name)
        private readonly responseRespondedEventModel: Model<ResponseRespondedEvent>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(RollupAction.name)
        private readonly rollupActionModel: Model<RollupAction>,
    ) {
        this._dkgRequest = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            requesterCounter: 0,
            keyIndexStorage:
                new Storage.RequestStorage.RequestKeyIndexStorage(),
            taskIdStorage: new Storage.RequestStorage.TaskStorage(),
            accumulationStorage:
                new Storage.RequestStorage.RequestAccumulationStorage(),
            expirationStorage: new Storage.RequestStorage.ExpirationStorage(),
            resultStorage: new Storage.RequestStorage.ResultStorage(),
            actionState: '',
        };

        this._dkgResponse = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            contributionStorage:
                new Storage.DKGStorage.ResponseContributionStorage(),
            responseStorage: new Storage.DKGStorage.ResponseStorage(),
            processStorage: new Storage.ProcessStorage.ProcessStorage(),
            processStorageMapping: {},
        };
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {
            console.log(err);
        }
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
                await this.fetchRequestActions();
                await this.fetchResponseActions();
                await this.updateRequestActions();
                await this.updateResponseActions();
                count = MaxRetries;
            } catch (err) {
                console.log(err);
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchDkgRequestState(): Promise<DkgRequestState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.REQUEST_ADDRESS,
        );
        const result: DkgRequestState = {
            zkAppRoot: Field(state[0]),
            requestCounter: Field(state[1]),
            keyIndexRoot: Field(state[2]),
            taskIdRoot: Field(state[3]),
            accumulationRoot: Field(state[4]),
            expirationRoot: Field(state[5]),
            resultRoot: Field(state[6]),
            actionState: Field(state[7]),
        };
        this._dkgRequest.requesterCounter = Number(
            result.requestCounter.toBigInt(),
        );
        this._dkgRequest.actionState = result.actionState.toString();
        return result;
    }

    private async fetchDkgResponseState(): Promise<DkgResponseState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.RESPONSE_ADDRESS,
        );
        const result: DkgResponseState = {
            zkAppRoot: Field(state[0]),
            contributionRoot: Field(state[1]),
            responseRoot: Field(state[2]),
            processRoot: Field(state[3]),
        };
        return result;
    }

    // ===== PRIVATE FUNCTIONS

    async fetchRequestActions() {
        const lastAction = await this.requestActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.REQUEST_ADDRESS,
        );
        let previousActionState: string;
        let actionId: number;
        if (!lastAction) {
            previousActionState = Reducer.initialActionState.toString();
            actionId = 0;
        } else {
            actions = actions.slice(lastAction.actionId + 1);
            previousActionState = lastAction.currentActionState;
            actionId = lastAction.actionId + 1;
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentActionState = action.hash;
            const actionData = getRequestActionData(action.actions[0]);
            await this.requestActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState,
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState,
                    previousActionState: previousActionState,
                    actions: action.actions[0],
                    actionData: actionData,
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
    }

    private async fetchResponseActions() {
        const lastAction = await this.responseActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.RESPONSE_ADDRESS,
        );
        let previousActionState: string;
        let actionId: number;
        if (!lastAction) {
            previousActionState = Reducer.initialActionState.toString();
            actionId = 0;
        } else {
            actions = actions.slice(lastAction.actionId + 1);
            previousActionState = lastAction.currentActionState;
            actionId = lastAction.actionId + 1;
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentActionState = action.hash;
            const actionData = getResponseActionData(action.actions[0]);
            await this.responseActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState,
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState,
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

    private async fetchResponseEvents() {
        const lastProcessedEvent =
            await this.responseProcessedEventModel.findOne(
                {},
                {},
                { sort: { batchId: -1, eventId: -1 } },
            );
        const lastFinalizedEvent =
            await this.responseFinalizedEventModel.findOne(
                {},
                {},
                { sort: { batchId: -1, eventId: -1 } },
            );
        const lastRespondedEvent =
            await this.responseProcessedEventModel.findOne(
                {},
                {},
                { sort: { batchId: -1, eventId: -1 } },
            );
        let batchId: number = lastProcessedEvent
            ? lastProcessedEvent.batchId
            : -1;
        batchId = lastFinalizedEvent
            ? lastFinalizedEvent.batchId > batchId
                ? lastFinalizedEvent.batchId
                : batchId
            : batchId;
        batchId = lastRespondedEvent
            ? lastRespondedEvent.batchId > batchId
                ? lastRespondedEvent.batchId
                : batchId
            : batchId;
        let eventId: number = lastProcessedEvent
            ? lastProcessedEvent.eventId
            : -1;
        eventId = lastFinalizedEvent
            ? lastFinalizedEvent.eventId > eventId
                ? lastFinalizedEvent.eventId
                : eventId
            : eventId;
        eventId = lastRespondedEvent
            ? lastRespondedEvent.eventId > eventId
                ? lastRespondedEvent.eventId
                : eventId
            : eventId;
        const events: Event[] = await this.queryService.fetchEvents(
            process.env.RESPONSE_ADDRESS,
        );
        batchId += 1;
        eventId += 1;
        for (; batchId < events.length; batchId++) {
            for (let j = 0; j < events[batchId].events.length; j++) {
                const event =
                    events[batchId].events[
                        events[batchId].events.length - 1 - j
                    ];
                if (Number(event.data[0]) == 0) {
                    await this.responseProcessedEventModel.findOneAndUpdate(
                        {
                            batchId: batchId,
                            eventId: eventId,
                        },
                        {
                            batchId: batchId,
                            eventId: eventId,
                            rawData: event.data,
                            data: getResponseProcessedEventData(
                                event.data.slice(1),
                            ),
                        },
                        { new: true, upsert: true },
                    );
                } else if (Number(event.data[0]) == 1) {
                    await this.responseFinalizedEventModel.findOneAndUpdate(
                        {
                            batchId: batchId,
                            eventId: eventId,
                        },
                        {
                            batchId: batchId,
                            eventId: eventId,
                            rawData: event.data,
                            data: getResponseFinalizedEventData(
                                event.data.slice(1),
                            ),
                        },
                        { new: true, upsert: true },
                    );
                } else {
                    await this.responseRespondedEventModel.findOneAndUpdate(
                        {
                            batchId: batchId,
                            eventId: eventId,
                        },
                        {
                            batchId: batchId,
                            eventId: eventId,
                            rawData: event.data,
                            data: getResponseRespondedEventData(
                                event.data.slice(1),
                            ),
                        },
                        { new: true, upsert: true },
                    );
                }
                eventId += 1;
            }
        }
    }

    private async fetchRequestEvents() {
        const lastEvent = await this.requestEventModel.findOne(
            {},
            {},
            { sort: { eventId: -1 } },
        );
        const events: Event[] = await this.queryService.fetchEvents(
            process.env.REQUEST_ADDRESS,
        );
        let batchId: number = lastEvent ? lastEvent.batchId + 1 : 0;
        let eventId: number = lastEvent ? lastEvent.eventId + 1 : 0;
        for (; batchId < events.length; batchId++) {
            for (let j = 0; j < events[batchId].events.length; j++) {
                const event =
                    events[batchId].events[
                        events[batchId].events.length - 1 - j
                    ];
                await this.requestEventModel.findOneAndUpdate(
                    {
                        batchId: batchId,
                        eventId: eventId,
                    },
                    {
                        batchId: batchId,
                        eventId: eventId,
                        rawData: event.data,
                        data: getRequestEventData(event.data),
                    },
                    { new: true, upsert: true },
                );
                eventId += 1;
            }
        }
    }

    private async updateRequestActions() {
        await this.fetchDkgRequestState();
        await this.fetchRequestEvents();

        const currentAction = await this.requestActionModel.findOne({
            currentActionState: this._dkgRequest.actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.requestActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            const latestRequest = await this.dkgRequestModel.findOne(
                {},
                {},
                { sort: { requestId: -1 } },
            );

            let nextRequestId = latestRequest ? latestRequest.requestId + 1 : 0;
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                if (
                    notActiveAction.actionData.requestId ==
                    Number(Field(-1).toBigInt())
                ) {
                    await this.dkgRequestModel.create({
                        requestId: nextRequestId,
                        keyIndex: notActiveAction.actionData.keyIndex,
                        task: notActiveAction.actionData.task,
                        expirationTimestamp:
                            notActiveAction.actionData.expirationTimestamp,
                        accumulationRoot:
                            notActiveAction.actionData.accumulationRoot,
                        resultRoot: notActiveAction.actionData.resultRoot,
                    });
                    nextRequestId += 1;
                } else {
                    const request = await this.dkgRequestModel.findOne({
                        requestId: notActiveAction.actionData.requestId,
                    });
                    const requestEvents = await this.requestEventModel.find(
                        {
                            'data.requestId':
                                notActiveAction.actionData.requestId,
                        },
                        {},
                        { sort: { 'data.dimensionIndex': 1 } },
                    );
                    const result: string[] = [];
                    requestEvents.map((event) => {
                        result.push(event.data.result);
                    });
                    request.set(
                        'resultRoot',
                        notActiveAction.actionData.resultRoot,
                    );
                    request.set('result', result);
                    request.set('status', RequestStatusEnum.RESOLVED);
                    await request.save();
                }

                await notActiveAction.save();
            }
        }

        await fetchLastBlock();
        const currentTimestamp = Number(
            Mina.getNetworkConstants().genesisTimestamp.toBigInt(),
        );
        const expiredRequests = await this.dkgRequestModel.find({
            status: RequestStatusEnum.INITIALIZED,
            expirationTimestamp: {
                $lt: currentTimestamp,
            },
        });
        for (let i = 0; i < expiredRequests.length; i++) {
            const expiredRequest = expiredRequests[i];
            expiredRequest.set('status', RequestStatusEnum.EXPIRED);
            await expiredRequest.save();
        }
    }

    private async updateResponseActions() {
        await this.fetchDkgResponseState();
        await this.fetchResponseEvents();

        const notProcessedEvents = await this.responseProcessedEventModel.find(
            { processed: false },
            {},
            { sort: { eventId: 1 } },
        );
        for (let i = 0; i < notProcessedEvents.length; i++) {
            const promises = [];
            const notProcessedEvent = notProcessedEvents[i];
            const request = await this.dkgRequestModel.findOne({
                requestId: notProcessedEvent.data.requestId,
            });
            const responseActions = await this.responseActionModel.find(
                {
                    currentActionState: { $in: notProcessedEvent.data.actions },
                },
                {},
                { sort: { 'actionData.memberId': 1 } },
            );
            const finalizedEvents = await this.responseFinalizedEventModel.find(
                { 'data.requestId': notProcessedEvent.data.requestId },
                {},
                { sort: { 'data.dimensionIndex': 1 } },
            );
            finalizedEvents.map((event) => {
                request.finalizedD.push(event.data.Di);
            });
            for (let j = 0; j < responseActions.length; j++) {
                const responseAction = responseActions[j];
                responseAction.set('active', true);

                const memberId = responseAction.actionData.memberId;
                const respondedEvents =
                    await this.responseRespondedEventModel.find(
                        {
                            'data.requestId': notProcessedEvent.data.requestId,
                            'data.memberId': memberId,
                        },
                        {},
                        { sort: { 'data.dimensionIndex': 1 } },
                    );
                const D: { x: string; y: string }[] = [];
                respondedEvents.map((event) => {
                    D.push(event.data.Di);
                });
                request.responses.push({
                    dimension: responseAction.actionData.dimension,
                    memberId: memberId,
                    rootD: responseAction.actionData.responseRootD,
                    D: D,
                });

                promises.push(responseAction.save());
            }
            notProcessedEvent.set('processed', true);
            await request.save();
            await Promise.all(promises);
            await notProcessedEvent.save();
        }
    }

    async updateMerkleTrees() {
        try {
            const requests = await this.dkgRequestModel.find(
                {},
                {},
                { sort: { requestId: 1 } },
            );
            for (let i = 0; i < requests.length; i++) {
                const request = requests[i];
                const level1Index =
                    this._dkgRequest.keyIndexStorage.calculateLevel1Index(
                        Field(request.requestId),
                    );
                this._dkgRequest.keyIndexStorage.updateRawLeaf(
                    { level1Index },
                    Field(request.keyIndex),
                );
                this._dkgRequest.taskIdStorage.updateLeaf(
                    { level1Index },
                    Field(request.task),
                );
                this._dkgRequest.accumulationStorage.updateLeaf(
                    { level1Index },
                    Field(request.accumulationRoot),
                );
                this._dkgRequest.expirationStorage.updateRawLeaf(
                    { level1Index },
                    new UInt64(request.expirationTimestamp),
                );
                this._dkgRequest.resultStorage.updateRawLeaf(
                    { level1Index },
                    Field(request.resultRoot),
                );

                const responses = request.responses.sort(
                    (a, b) => a.memberId - b.memberId,
                );

                if (
                    request.finalizedD.length != 0 &&
                    request.finalizedD != undefined
                ) {
                    const groupVectorStorage = new GroupVectorStorage();
                    request.finalizedD.map((Di, index) => {
                        groupVectorStorage.updateRawLeaf(
                            { level1Index: Field(index) },
                            Group.from(Di.x, Di.y),
                        );
                    });
                    this._dkgResponse.responseStorage.updateLeaf(
                        { level1Index },
                        groupVectorStorage.root,
                    );
                }
                for (let j = 0; j < responses.length; j++) {
                    const response = responses[j];
                    const level2Index =
                        this._dkgResponse.contributionStorage.calculateLevel2Index(
                            Field(response.memberId),
                        );

                    this._dkgResponse.contributionStorage.updateLeaf(
                        { level1Index, level2Index },
                        Field(response.rootD),
                    );
                }
            }
            await this.updateProcessStorageForResponse();
        } catch (err) {}
    }

    private async updateProcessStorageForResponse() {
        const responseEvents = await this.responseProcessedEventModel.find(
            {},
            {},
            { sort: { eventId: 1 } },
        );
        for (let i = 0; i < responseEvents.length; i++) {
            const responseEvent = responseEvents[i];
            for (let j = 0; j < responseEvent.data.actions.length; j++) {
                const actionState = responseEvent.data.actions[j];
                if (!this._dkgResponse.processStorageMapping[actionState]) {
                    this._dkgResponse.processStorageMapping[actionState] =
                        Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                } else {
                    this._dkgResponse.processStorageMapping[actionState] +=
                        Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                }
            }
        }
        const responseActions = await this.responseActionModel.find(
            { active: true },
            {},
            { sort: { actionId: 1 } },
        );
        for (let i = 0; i < responseActions.length; i++) {
            const responseAction = responseActions[i];
            if (
                this._dkgResponse.processStorageMapping[
                    responseAction.currentActionState
                ] != undefined
            ) {
                this._dkgResponse.processStorage.updateAction(
                    Field(responseAction.actionId),
                    {
                        actionState: Field(responseAction.currentActionState),
                        processCounter: new UInt8(
                            this._dkgResponse.processStorageMapping[
                                responseAction.currentActionState
                            ],
                        ),
                    },
                );
            }
        }
    }
}
