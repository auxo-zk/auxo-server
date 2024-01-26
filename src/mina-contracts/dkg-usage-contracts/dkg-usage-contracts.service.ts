import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel, raw } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RequestAction,
    getRawDkgRequest,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import {
    Field,
    Group,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { RawDkgRequest } from 'src/schemas/raw-request.schema';
import {
    ResponseAction,
    getDkgResponse,
} from 'src/schemas/actions/response-action.schema';
import { DkgResponse } from 'src/schemas/response.schema';
import {
    ActionReduceStatusEnum,
    RequestActionEnum,
    RequestEventEnum,
    RequestStatusEnum,
    zkAppCache,
} from 'src/constants';
import { Event } from 'src/interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';
import {
    BatchDecryption,
    CompleteResponse,
    Constants,
    CreateRequest,
    ReduceResponse,
    RequestContract,
    ResponseContract,
    ResponseContribution,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import {
    DkgRequestState,
    DkgResponseState,
} from 'src/interfaces/zkapp-state.interface';
import { Utilities } from '../utilities';

@Injectable()
export class DkgUsageContractsService implements ContractServiceInterface {
    private readonly _requestIds: string[];
    private logger = new Logger(DkgUsageContractsService.name);

    private readonly _dkgRequest: {
        requester: Storage.RequestStorage.RequesterStorage;
        requestStatus: Storage.RequestStorage.RequestStatusStorage;
    };

    private readonly _dkgResponse: {
        zkApp: Storage.SharedStorage.AddressStorage;
        reducedActions: Field[];
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.RequestStorage.ResponseContributionStorage;
    };

    public get requestIds(): string[] {
        return this._requestIds;
    }
    public get dkgRequest(): {
        requester: Storage.RequestStorage.RequesterStorage;
        requestStatus: Storage.RequestStorage.RequestStatusStorage;
    } {
        return this._dkgRequest;
    }

    public get dkgResponse(): {
        zkApp: Storage.SharedStorage.AddressStorage;
        reducedActions: Field[];
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.RequestStorage.ResponseContributionStorage;
    } {
        return this._dkgResponse;
    }

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(RawDkgRequest.name)
        private readonly rawDkgRequestModel: Model<RawDkgRequest>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(ResponseAction.name)
        private readonly responseActionModel: Model<ResponseAction>,
        @InjectModel(DkgResponse.name)
        private readonly dkgResponseModel: Model<DkgResponse>,
    ) {
        this._requestIds = [];
        this._dkgRequest = {
            requester: new Storage.RequestStorage.RequesterStorage(),
            requestStatus: new Storage.RequestStorage.RequestStatusStorage(),
        };
        this._dkgResponse = {
            zkApp: new Storage.SharedStorage.AddressStorage([
                {
                    index: Constants.ZkAppEnum.COMMITTEE,
                    address: PublicKey.fromBase58(
                        process.env.COMMITTEE_ADDRESS,
                    ),
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
                    index: Constants.ZkAppEnum.REQUEST,
                    address: PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                },
            ]),
            reducedActions: [],
            reduceState: new Storage.SharedStorage.ReduceStorage(),
            contribution:
                new Storage.RequestStorage.ResponseContributionStorage(),
        };
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            await this.compile();
            await this.rollupDkgResponse();
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
        try {
            await this.fetchRequestActions();
            await this.fetchResponseActions();
            await this.updateRawDkgRequests();
            await this.updateDkgRequests();
            await this.updateDkgResponse();
        } catch (err) {
            console.log(err);
        }
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(CreateRequest, cache, this.logger);
        await Utilities.compile(RequestContract, cache, this.logger);
        await Utilities.compile(ReduceResponse, cache, this.logger);
        await Utilities.compile(BatchDecryption, cache, this.logger);
        await Utilities.compile(CompleteResponse, cache, this.logger);
        await Utilities.compile(ResponseContract, cache, this.logger);
    }

    async rollupDkgRequest() {
        const lastActiveRawDkgRequest = await this.rawDkgRequestModel.findOne(
            {
                active: true,
            },
            {},
            { sort: { actionId: -1 } },
        );
        const lastReducedAction = lastActiveRawDkgRequest
            ? await this.requestActionModel.findOne({
                  actionId: lastActiveRawDkgRequest.actionId,
              })
            : undefined;
        const notReducedActions = await this.requestActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const state = await this.fetchDkgRequestState();
            let proof = await CreateRequest.firstStep(
                state.actionState,
                state.requestStatus,
                state.requester,
            );
            const notActiveRawDkgRequests = await this.rawDkgRequestModel.find(
                {
                    actionId: {
                        $gt: lastReducedAction
                            ? lastReducedAction.actionId
                            : -1,
                    },
                },
                {},
                { sort: { actionId: 1 } },
            );
            const requestStatus = this._dkgRequest.requestStatus;
            const requester = this._dkgRequest.requester;
            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                const notActiveRawDkgRequest = notActiveRawDkgRequests[i];
                const requestId = Field(notActiveRawDkgRequest.requestId);
                let status: RequestStatusEnum =
                    RequestStatusEnum.NOT_YET_REQUESTED;
                if (
                    notActiveRawDkgRequest.actionEnum ==
                    RequestActionEnum.REQUEST
                ) {
                    status = RequestStatusEnum.REQUESTING;
                } else if (
                    notActiveRawDkgRequest.actionEnum ==
                    RequestActionEnum.RESOLVE
                ) {
                    status = RequestStatusEnum.RESOLVED;
                }
                proof = await CreateRequest.nextStep(
                    proof,
                    ZkApp.Request.RequestAction.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    requestStatus.getWitness(requestId),
                    requester.getWitness(requestId),
                    PublicKey.fromBase58(notActiveRawDkgRequest.requester),
                );
                requestStatus.updateLeaf(
                    { level1Index: requestId },
                    Storage.RequestStorage.RequestStatusStorage.calculateLeaf(
                        Field(status),
                    ),
                );
                requester.updateLeaf(
                    { level1Index: requestId },
                    Storage.RequestStorage.RequesterStorage.calculateLeaf(
                        PublicKey.fromBase58(notActiveRawDkgRequest.requester),
                    ),
                );
            }
            const dkgRequestContract = new RequestContract(
                PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            const tx = await Mina.transaction(
                {
                    sender: feePayerPrivateKey.toPublicKey(),
                    fee: process.env.FEE,
                },
                () => {
                    dkgRequestContract.rollupRequest(proof);
                },
            );
            await Utilities.proveAndSend(
                tx,
                feePayerPrivateKey,
                false,
                this.logger,
            );
        }
    }

    async rollupDkgResponse() {
        const lastActiveDkgResponse = await this.dkgResponseModel.findOne(
            { active: true },
            {},
            { sort: { actionId: -1 } },
        );
        const lastReducedAction = lastActiveDkgResponse
            ? await this.responseActionModel.findOne({
                  actionId: lastActiveDkgResponse.actionId,
              })
            : undefined;
        const notReducedActions = await this.responseActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const state = await this.fetchDkgResponseState();
            let proof = await ReduceResponse.firstStep(
                lastReducedAction
                    ? ZkApp.Response.Action.fromFields(
                          Utilities.stringArrayToFields(
                              lastReducedAction.actions,
                          ),
                      )
                    : ZkApp.Response.Action.empty(),
                state.reduceState,
                lastReducedAction
                    ? Field(lastReducedAction.currentActionState)
                    : Reducer.initialActionState,
            );
            const reduceState = this._dkgResponse.reduceState;
            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                proof = await ReduceResponse.nextStep(
                    ZkApp.Response.Action.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    proof,
                    reduceState.getWitness(
                        Field(notReducedAction.currentActionState),
                    ),
                );
                reduceState.updateLeaf(
                    Storage.SharedStorage.ReduceStorage.calculateIndex(
                        Field(notReducedAction.currentActionState),
                    ),
                    Storage.SharedStorage.ReduceStorage.calculateLeaf(
                        Number(ActionReduceStatusEnum.REDUCED),
                    ),
                );
            }
            const dkgResponseContract = new ResponseContract(
                PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            const tx = await Mina.transaction(
                {
                    sender: feePayerPrivateKey.toPublicKey(),
                    fee: process.env.FEE,
                },
                () => {
                    dkgResponseContract.reduce(proof);
                },
            );
            await Utilities.proveAndSend(
                tx,
                feePayerPrivateKey,
                false,
                this.logger,
            );
        }
    }

    // ===== PRIVATE FUNCTIONS

    private async fetchDkgRequestState(): Promise<DkgRequestState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.REQUEST_ADDRESS,
        );
        return {
            requestStatus: Field(state[0]),
            requester: Field(state[1]),
            actionState: Field(state[2]),
            responseContractAddress: Field(state[3]),
        };
    }

    private async fetchDkgResponseState(): Promise<DkgResponseState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.RESPONSE_ADDRESS,
        );
        return {
            zkApp: Field(state[0]),
            reduceState: Field(state[1]),
            contribution: Field(state[2]),
        };
    }

    private async fetchRequestActions() {
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
    }

    private async updateRawDkgRequests() {
        let promises = [];
        const lastRawDkgRequest = await this.rawDkgRequestModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let requestActions: RequestAction[];
        if (lastRawDkgRequest != null) {
            requestActions = await this.requestActionModel.find(
                { actionId: { $gt: lastRawDkgRequest.actionId } },
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
                this.rawDkgRequestModel.findOneAndUpdate(
                    { actionId: requestAction.actionId },
                    getRawDkgRequest(requestAction),
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
                const rawDkgRequests = await this.rawDkgRequestModel.find({
                    requestId: event.requestId,
                    committeeId: undefined,
                    keyId: undefined,
                });
                for (let j = 0; j < rawDkgRequests.length; j++) {
                    const rawDkgRequest = rawDkgRequests[j];
                    rawDkgRequest.set('committeeId', event.committeeId);
                    rawDkgRequest.set('keyId', event.keyId);
                    await rawDkgRequest.save();
                }
            } else {
                lastActionHash = event.actionHash;
            }
        }
        if (lastActionHash != null) {
            const lastRequestAction = await this.requestActionModel.findOne({
                currentActionState: lastActionHash,
            });

            const notActiveRawDkgRequests = await this.rawDkgRequestModel.find(
                {
                    actionId: { $lte: lastRequestAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveRawDkgRequests.length; i++) {
                const notActiveRawDkgRequest = notActiveRawDkgRequests[i];
                notActiveRawDkgRequest.set('active', true);
                await notActiveRawDkgRequest.save();
            }
        }
    }

    private async updateDkgRequests() {
        const existedRequestIds = await this.dkgRequestModel
            .find({})
            .distinct('requestId');
        const notExistedRequestIds = await this.rawDkgRequestModel
            .find({ requestId: { $nin: existedRequestIds }, active: true })
            .distinct('requestId');
        for (let i = 0; i < notExistedRequestIds.length; i++) {
            await this.dkgRequestModel.create({
                requestId: notExistedRequestIds[i],
            });
        }
        const notResolvedDkgRequests = await this.dkgRequestModel.find({
            status: { $ne: RequestStatusEnum.RESOLVED },
        });
        for (let i = 0; i < notResolvedDkgRequests.length; i++) {
            const notResolvedDkgRequest = notResolvedDkgRequests[i];
            if (
                notResolvedDkgRequest.status ==
                RequestStatusEnum.NOT_YET_REQUESTED
            ) {
                const rawDkgRequest = await this.rawDkgRequestModel.findOne({
                    requestId: notResolvedDkgRequest.requestId,
                    actionEnum: RequestActionEnum.REQUEST,
                    active: true,
                });
                if (rawDkgRequest) {
                    notResolvedDkgRequest.set(
                        'committeeId',
                        rawDkgRequest.committeeId,
                    );
                    notResolvedDkgRequest.set('keyId', rawDkgRequest.keyId);
                    notResolvedDkgRequest.set(
                        'requester',
                        rawDkgRequest.requester,
                    );
                    notResolvedDkgRequest.set('R', rawDkgRequest.R);
                    notResolvedDkgRequest.set(
                        'status',
                        RequestStatusEnum.REQUESTING,
                    );
                }
            }
            if (notResolvedDkgRequest.status == RequestStatusEnum.REQUESTING) {
                const rawDkgRequest = await this.rawDkgRequestModel.findOne({
                    requestId: notResolvedDkgRequest.requestId,
                    actionEnum: RequestActionEnum.RESOLVE,
                    active: true,
                });
                if (rawDkgRequest) {
                    notResolvedDkgRequest.set('D', rawDkgRequest.D);
                    notResolvedDkgRequest.set(
                        'status',
                        RequestStatusEnum.RESOLVED,
                    );
                }
            }

            await notResolvedDkgRequest.save();
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

    async updateMerkleTrees() {
        try {
            // Create reduce tree for response
            const lastActiveAction = await this.dkgResponseModel.findOne(
                {
                    active: true,
                },
                {},
                { sort: { actionId: -1 } },
            );
            const responses = lastActiveAction
                ? await this.responseActionModel.find(
                      {
                          actionId: { $lte: lastActiveAction.actionId },
                      },
                      {},
                      { sort: { actionId: 1 } },
                  )
                : [];
            responses.map((action) => {
                this._dkgResponse.reducedActions.push(
                    Field(action.currentActionState),
                );
                this._dkgResponse.reduceState.updateLeaf(
                    this._dkgResponse.reduceState.calculateIndex(
                        Field(action.currentActionState),
                    ),
                    this._dkgResponse.reduceState.calculateLeaf(
                        Number(ActionReduceStatusEnum.REDUCED),
                    ),
                );
            });

            const dkgRequests = await this.dkgRequestModel.find({
                status: {
                    $gte: RequestStatusEnum.REQUESTING,
                },
            });
            for (let i = 0; i < dkgRequests.length; i++) {
                const dkgRequest = dkgRequests[i];
                const level1Index =
                    this._dkgRequest.requester.calculateLevel1Index(
                        Field(dkgRequest.requestId),
                    );
                const requesterLeaf = this._dkgRequest.requester.calculateLeaf(
                    PublicKey.fromBase58(dkgRequest.requester),
                );
                const requestVector = ZkApp.Request.RequestVector.empty();
                dkgRequest.D.map((d, index) => {
                    requestVector.set(Field(index), Group.from(d.x, d.y));
                });
                const requestStatusLeaf =
                    this._dkgRequest.requestStatus.calculateLeaf(
                        Field(
                            dkgRequest.status == RequestStatusEnum.REQUESTING
                                ? RequestStatusEnum.REQUESTING
                                : requestVector.hash(),
                        ),
                    );
                // const requestContribution  =
                this._dkgRequest.requestStatus.updateLeaf(
                    { level1Index: level1Index },
                    requestStatusLeaf,
                );
                this._dkgRequest.requester.updateLeaf(
                    { level1Index: level1Index },
                    requesterLeaf,
                );

                // create remaining trees
                const dkgResponses = await this.dkgResponseModel.find({
                    requestId: dkgRequest.requestId,
                    active: true,
                });
                this._dkgResponse.contribution.updateInternal(
                    level1Index,
                    Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                );
                for (let j = 0; j < dkgResponses.length; j++) {
                    const dkgResponse = dkgResponses[j];
                    const level2Index =
                        this._dkgResponse.contribution.calculateLevel2Index(
                            Field(dkgResponse.memberId),
                        );
                    const responseContribution = ResponseContribution.empty();
                    dkgResponse.contribution.map((c, index) => {
                        responseContribution.D.set(
                            Field(index),
                            Group.from(c.x, c.y),
                        );
                    });
                    const leaf =
                        this._dkgResponse.contribution.calculateLeaf(
                            responseContribution,
                        );
                    this._dkgResponse.contribution.updateLeaf(
                        { level1Index: level1Index, level2Index: level2Index },
                        leaf,
                    );
                }
                if (!this._requestIds.includes(dkgRequest.requestId)) {
                    this._requestIds.push(dkgRequest.requestId);
                }
            }
        } catch (err) {}
    }
}
