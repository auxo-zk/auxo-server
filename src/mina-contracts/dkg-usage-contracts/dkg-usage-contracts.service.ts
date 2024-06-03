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
    Scalar,
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
    ZkAppCache,
} from 'src/constants';
import { Event } from 'src/interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';
import {
    accumulateResponses,
    BatchDecryption,
    bruteForceResultVector,
    calculateKeyIndex,
    ComputeResponse,
    ComputeResult,
    ComputeResultInput,
    Constants,
    DArray,
    DKG_LEVEL_2_TREE,
    FinalizedEvent,
    FinalizeResponse,
    FinalizeResponseInput,
    getResultVector,
    GroupVectorStorage,
    RequestContract,
    ResponseContract,
    ResponseContribution,
    ResponseContributionStorage,
    ScalarVectorStorage,
    Storage,
    UpdateRequest,
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
import { Utils } from '@auxo-dev/auxo-libs';
import { Key } from 'src/schemas/key.schema';
import { RollupContractService } from '../rollup-contract/rollup-contract.service';
import { Task } from 'src/schemas/task.schema';
import { RequesterContractsService } from '../requester-contract/requester-contract.service';

@Injectable()
export class DkgUsageContractsService implements ContractServiceInterface {
    private logger = new Logger(DkgUsageContractsService.name);

    private _dkgRequest: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        requesterCounter: number;
        keyIndexStorage: Storage.RequestStorage.RequestKeyIndexStorage;
        taskStorage: Storage.RequestStorage.TaskStorage;
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
        taskStorage: Storage.RequestStorage.TaskStorage;
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
        private readonly requesterContractsService: RequesterContractsService,
        private readonly rollupContractService: RollupContractService,
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
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
    ) {
        this._dkgRequest = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            requesterCounter: 0,
            keyIndexStorage:
                new Storage.RequestStorage.RequestKeyIndexStorage(),
            taskStorage: new Storage.RequestStorage.TaskStorage(),
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
            // Provable.log(await this.fetchDkgResponseState());
            // Provable.log(this._dkgResponse.contributionStorage.root);
            // Provable.log(this._dkgResponse.responseStorage.root);
            // Provable.log(this._dkgResponse.processStorage.root);
            // await this.compile();
            // await this.rollupContractService.compile();
            // await this.rollupResponse();
            // await this.computeResult();
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
        const cache = ZkAppCache;
        await UpdateRequest.compile({ cache });
        await ComputeResult.compile({ cache });
        await RequestContract.compile({ cache });
        await BatchDecryption.compile({ cache });
        await ComputeResponse.compile({ cache });
        await FinalizeResponse.compile({ cache });
        await ResponseContract.compile({ cache });
    }

    async rollupRequest(): Promise<boolean> {
        try {
            const notActiveActions = await this.requestActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                const state = await this.fetchDkgRequestState();
                let proof = await Utils.prove(
                    UpdateRequest.name,
                    'init',
                    async () =>
                        UpdateRequest.init(
                            ZkApp.Request.RequestAction.empty(),
                            state.requestCounter,
                            state.keyIndexRoot,
                            state.taskRoot,
                            state.accumulationRoot,
                            state.expirationRoot,
                            state.resultRoot,
                            state.actionState,
                        ),
                    undefined,
                    { info: true, error: true },
                );
                const keyIndexStorage = _.cloneDeep(
                    this._dkgRequest.keyIndexStorage,
                );
                const taskStorage = _.cloneDeep(this._dkgRequest.taskStorage);
                const accumulationStorage = _.cloneDeep(
                    this._dkgRequest.accumulationStorage,
                );
                const expirationStorage = _.cloneDeep(
                    this._dkgRequest.expirationStorage,
                );
                const resultStorage = _.cloneDeep(
                    this._dkgRequest.resultStorage,
                );

                let nextRequestId = state.requestCounter;
                for (let i = 0; i < notActiveActions.length; i++) {
                    const notActiveAction = notActiveActions[i];
                    if (
                        notActiveAction.actionData.requestId ==
                        Number(Field(-1).toBigInt())
                    ) {
                        proof = await Utils.prove(
                            UpdateRequest.name,
                            'initialize',
                            async () =>
                                UpdateRequest.initialize(
                                    ZkApp.Request.RequestAction.fromFields(
                                        Utilities.stringArrayToFields(
                                            notActiveAction.actions,
                                        ),
                                    ),
                                    proof,
                                    keyIndexStorage.getLevel1Witness(
                                        nextRequestId,
                                    ),
                                    taskStorage.getLevel1Witness(nextRequestId),
                                    accumulationStorage.getLevel1Witness(
                                        nextRequestId,
                                    ),
                                    expirationStorage.getLevel1Witness(
                                        nextRequestId,
                                    ),
                                ),
                            undefined,
                            { info: true, error: true },
                        );
                        keyIndexStorage.updateLeaf(
                            { level1Index: nextRequestId },
                            Field(notActiveAction.actionData.keyIndex),
                        );
                        taskStorage.updateLeaf(
                            { level1Index: nextRequestId },
                            Field(notActiveAction.actionData.task),
                        );
                        accumulationStorage.updateLeaf(
                            { level1Index: nextRequestId },
                            Field(notActiveAction.actionData.accumulationRoot),
                        );
                        expirationStorage.updateLeaf(
                            { level1Index: nextRequestId },
                            expirationStorage.calculateLeaf(
                                new UInt64(
                                    notActiveAction.actionData.expirationTimestamp,
                                ),
                            ),
                        );
                        nextRequestId = nextRequestId.add(1);
                    } else {
                        proof = await Utils.prove(
                            UpdateRequest.name,
                            'resolve',
                            async () =>
                                UpdateRequest.resolve(
                                    ZkApp.Request.RequestAction.fromFields(
                                        Utilities.stringArrayToFields(
                                            notActiveAction.actions,
                                        ),
                                    ),
                                    proof,
                                    resultStorage.getLevel1Witness(
                                        Field(
                                            notActiveAction.actionData
                                                .requestId,
                                        ),
                                    ),
                                ),
                            undefined,
                            { info: true, error: true },
                        );
                        resultStorage.updateLeaf(
                            {
                                level1Index: Field(
                                    notActiveAction.actionData.requestId,
                                ),
                            },
                            Field(notActiveAction.actionData.resultRoot),
                        );
                    }
                }
                const requestContract = new RequestContract(
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                await Utils.proveAndSendTx(
                    RequestContract.name,
                    'update',
                    async () => requestContract.update(proof),
                    {
                        sender: {
                            privateKey: feePayerPrivateKey,
                            publicKey: feePayerPrivateKey.toPublicKey(),
                        },
                        fee: process.env.FEE,
                        memo: '',
                        nonce: await this.queryService.fetchAccountNonce(
                            feePayerPrivateKey.toPublicKey().toBase58(),
                        ),
                    },
                    undefined,
                    undefined,
                    { info: true, error: true, memoryUsage: false },
                );
                return true;
            }
            return false;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    async rollupResponse(): Promise<boolean> {
        try {
            const numRollupedActions = await this.rollupActionModel.count({
                'actionData.zkAppIndex': ZkAppIndex.RESPONSE,
                active: true,
            });
            const requests = await this.dkgRequestModel.find({
                status: RequestStatusEnum.INITIALIZED,
            });
            for (let i = 0; i < requests.length; i++) {
                try {
                    const request = requests[i];
                    const key = await this.keyModel.findOne({
                        keyIndex: request.keyIndex,
                    });
                    const committee = await this.committeeModel.findOne({
                        committeeId: key.committeeId,
                    });
                    // const notActiveActions = await this.responseActionModel.find({
                    //     'actionData.requestId': request.requestId,
                    //     active: false,
                    //     actionId: {
                    //         $lt: numRollupedActions,
                    //     },
                    // });
                    const finalizedEventExist =
                        await this.responseFinalizedEventModel.exists({
                            'data.requestId': request.requestId,
                        });
                    if (finalizedEventExist) {
                        break;
                    }
                    let notActiveActions =
                        await this.responseActionModel.aggregate([
                            {
                                $match: {
                                    'actionData.requestId': request.requestId,
                                    active: false,
                                    actionId: { $lt: numRollupedActions },
                                },
                            },
                            {
                                $sort: { actionId: -1 },
                            },
                            {
                                $group: {
                                    _id: '$actionData.memberId',
                                    latestAction: { $first: '$$ROOT' },
                                },
                            },
                            {
                                $replaceRoot: { newRoot: '$latestAction' },
                            },
                            {
                                $sort: { 'actionData.memberId': 1 },
                            },
                        ]);
                    if (notActiveActions.length > committee.threshold) {
                        notActiveActions = notActiveActions.slice(
                            0,
                            committee.threshold,
                        );
                    }
                    if (notActiveActions.length == committee.threshold) {
                        console.log(notActiveActions);
                        const task = await this.taskModel.findOne({
                            task: request.task,
                        });
                        const state = await this.fetchDkgResponseState();
                        const contributionStorage = _.cloneDeep(
                            this._dkgResponse.contributionStorage,
                        );
                        const responseStorage = _.cloneDeep(
                            this._dkgResponse.responseStorage,
                        );
                        const processStorage = _.cloneDeep(
                            this._dkgResponse.processStorage,
                        );
                        const processStorageMapping = _.cloneDeep(
                            this._dkgResponse.processStorageMapping,
                        );
                        const rollupStorage = _.cloneDeep(
                            this.rollupContractService.rollupStorage,
                        );
                        const level1Index = Field(request.requestId);
                        const indexList = Field.fromBits(
                            notActiveActions
                                .map((action) =>
                                    Field(action.actionData.memberId),
                                )
                                .map((e) => e.toBits(6))
                                .flat(),
                        );

                        let proof = await Utils.prove(
                            FinalizeResponse.name,
                            'init',
                            async () =>
                                FinalizeResponse.init(
                                    FinalizeResponseInput.empty(),
                                    Field(committee.threshold),
                                    Field(committee.numberOfMembers),
                                    new UInt8(
                                        Constants.ENCRYPTION_LIMITS.FULL_DIMENSION,
                                    ),
                                    level1Index,
                                    indexList,
                                    state.contributionRoot,
                                    state.processRoot,
                                    rollupStorage.root,
                                    contributionStorage.getLevel1Witness(
                                        level1Index,
                                    ),
                                ),
                            undefined,
                            { info: true, error: true },
                        );

                        const memberIds = [];
                        const D: Group[][] = [];
                        const groupVectorStorages: GroupVectorStorage[] = [];
                        contributionStorage.updateInternal(
                            level1Index,
                            DKG_LEVEL_2_TREE(),
                        );
                        // responseStorage.
                        for (let j = 0; j < notActiveActions.length; j++) {
                            const notActiveAction = notActiveActions[j];
                            const level2Index = Field(
                                notActiveAction.actionData.memberId,
                            );
                            memberIds.push(notActiveAction.actionData.memberId);
                            let respondedEvents =
                                await this.responseRespondedEventModel.find(
                                    {
                                        'data.requestId': request.requestId,
                                        'data.memberId':
                                            notActiveAction.actionData.memberId,
                                    },
                                    {},
                                    { sort: { eventId: -1 } },
                                );
                            respondedEvents = respondedEvents.slice(
                                0,
                                Constants.ENCRYPTION_LIMITS.FULL_DIMENSION,
                            );
                            respondedEvents = respondedEvents.sort(
                                (a, b) =>
                                    a.data.dimensionIndex -
                                    b.data.dimensionIndex,
                            );
                            D[j] = respondedEvents.map((event) =>
                                Group.from(event.data.Di.x, event.data.Di.y),
                            );
                            const groupVectorStorage = new GroupVectorStorage();
                            // console.log(D[j].length);
                            D[j].map((Di, index) => {
                                groupVectorStorage.updateRawLeaf(
                                    { level1Index: Field(index) },
                                    Di,
                                );
                            });

                            groupVectorStorages.push(groupVectorStorage);
                            const responseAction =
                                ZkApp.Response.ResponseAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notActiveAction.actions,
                                    ),
                                );

                            proof = await Utils.prove(
                                FinalizeResponse.name,
                                'contribute',
                                async () =>
                                    FinalizeResponse.contribute(
                                        {
                                            previousActionState: Field(
                                                notActiveAction.previousActionState,
                                            ),
                                            action: responseAction,
                                            actionId: Field(
                                                notActiveAction.actionId,
                                            ),
                                        },
                                        proof,
                                        contributionStorage.getWitness(
                                            level1Index,
                                            level2Index,
                                        ),
                                        rollupStorage.getWitness(
                                            rollupStorage.calculateLevel1Index({
                                                zkAppIndex: Field(
                                                    ZkAppIndex.RESPONSE,
                                                ),
                                                actionId: Field(
                                                    notActiveAction.actionId,
                                                ),
                                            }),
                                        ),
                                        processStorage.getWitness(
                                            Field(notActiveAction.actionId),
                                        ),
                                    ),
                                undefined,
                                { info: true, error: true },
                            );

                            contributionStorage.updateRawLeaf(
                                {
                                    level1Index: level1Index,
                                    level2Index: level2Index,
                                },
                                Field(notActiveAction.actionData.responseRootD),
                            );
                            if (
                                processStorageMapping[
                                    notActiveAction.currentActionState
                                ] == undefined
                            ) {
                                processStorageMapping[
                                    notActiveAction.currentActionState
                                ] = 0;
                            } else {
                                processStorageMapping[
                                    notActiveAction.currentActionState
                                ] += 1;
                            }
                            processStorage.updateLeaf(
                                {
                                    level1Index: Field(
                                        notActiveAction.actionId,
                                    ),
                                },
                                processStorage.calculateLeaf({
                                    actionState: Field(
                                        notActiveAction.currentActionState,
                                    ),
                                    processCounter: new UInt8(
                                        processStorageMapping[
                                            notActiveAction.currentActionState
                                        ],
                                    ),
                                }),
                            );
                        }
                        const sumD = accumulateResponses(memberIds, D);
                        const groupVectorStorage = new GroupVectorStorage();
                        for (let j = 0; j < task.totalR.length; j++) {
                            for (let k = 0; k < notActiveActions.length; k++) {
                                const notActiveAction = notActiveActions[k];
                                const responseAction =
                                    ZkApp.Response.ResponseAction.fromFields(
                                        Utilities.stringArrayToFields(
                                            notActiveAction.actions,
                                        ),
                                    );

                                proof = await Utils.prove(
                                    FinalizeResponse.name,
                                    'compute',
                                    async () =>
                                        FinalizeResponse.compute(
                                            {
                                                previousActionState: Field(
                                                    notActiveAction.previousActionState,
                                                ),
                                                action: responseAction,
                                                actionId: Field(
                                                    notActiveAction.actionId,
                                                ),
                                            },
                                            proof,
                                            D[k][j],
                                            groupVectorStorages[k].getWitness(
                                                Field(j),
                                            ),
                                            processStorage.getWitness(
                                                Field(notActiveAction.actionId),
                                            ),
                                        ),
                                    undefined,
                                    { info: true, error: true },
                                );
                                if (
                                    processStorageMapping[
                                        notActiveAction.currentActionState
                                    ] == undefined
                                ) {
                                    processStorageMapping[
                                        notActiveAction.currentActionState
                                    ] = 0;
                                } else {
                                    processStorageMapping[
                                        notActiveAction.currentActionState
                                    ] += 1;
                                }
                                processStorage.updateLeaf(
                                    {
                                        level1Index: Field(
                                            notActiveAction.actionId,
                                        ),
                                    },
                                    processStorage.calculateLeaf({
                                        actionState: Field(
                                            notActiveAction.currentActionState,
                                        ),
                                        processCounter: new UInt8(
                                            processStorageMapping[
                                                notActiveAction.currentActionState
                                            ],
                                        ),
                                    }),
                                );
                            }

                            proof = await Utils.prove(
                                FinalizeResponse.name,
                                'finalize',
                                async () =>
                                    FinalizeResponse.finalize(
                                        FinalizeResponseInput.empty(),
                                        proof,
                                        groupVectorStorage.getWitness(Field(j)),
                                    ),
                                undefined,
                                { info: true, error: true },
                            );
                            groupVectorStorage.updateRawLeaf(
                                { level1Index: Field(j) },
                                sumD[j],
                            );
                        }
                        responseStorage.updateRawLeaf(
                            { level1Index },
                            groupVectorStorage.root,
                        );
                        const responseContract = new ResponseContract(
                            PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
                        );
                        const feePayerPrivateKey = PrivateKey.fromBase58(
                            process.env.FEE_PAYER_PRIVATE_KEY,
                        );
                        await Utils.proveAndSendTx(
                            ResponseContract.name,
                            'finalize',
                            async () =>
                                responseContract.finalize(
                                    proof,
                                    this.committeeContractService.settingStorage.getLevel1Witness(
                                        Field(committee.committeeId),
                                    ),
                                    this._dkgRequest.keyIndexStorage.getLevel1Witness(
                                        level1Index,
                                    ),
                                    this._dkgResponse.responseStorage.getLevel1Witness(
                                        level1Index,
                                    ),
                                    this._dkgResponse.zkAppStorage.getZkAppRef(
                                        ZkAppIndex.COMMITTEE,
                                        PublicKey.fromBase58(
                                            process.env.COMMITTEE_ADDRESS,
                                        ),
                                    ),
                                    this._dkgResponse.zkAppStorage.getZkAppRef(
                                        ZkAppIndex.REQUEST,
                                        PublicKey.fromBase58(
                                            process.env.REQUEST_ADDRESS,
                                        ),
                                    ),
                                    this._dkgResponse.zkAppStorage.getZkAppRef(
                                        ZkAppIndex.ROLLUP,
                                        PublicKey.fromBase58(
                                            process.env.ROLLUP_ADDRESS,
                                        ),
                                    ),
                                ),
                            {
                                sender: {
                                    privateKey: feePayerPrivateKey,
                                    publicKey: feePayerPrivateKey.toPublicKey(),
                                },
                                fee: process.env.FEE,
                                memo: '',
                                nonce: await this.queryService.fetchAccountNonce(
                                    feePayerPrivateKey.toPublicKey().toBase58(),
                                ),
                            },
                            undefined,
                            undefined,
                            { info: true, error: true, memoryUsage: false },
                        );
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.log(err);
                }
            }
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    async computeResult() {
        try {
            const numRollupedActions = await this.rollupActionModel.count({
                'actionData.zkAppIndex': ZkAppIndex.RESPONSE,
                active: true,
            });
            const requests = await this.dkgRequestModel.find({
                status: RequestStatusEnum.INITIALIZED,
            });
            for (let i = 0; i < requests.length; i++) {
                const request = requests[i];
                const key = await this.keyModel.findOne({
                    keyIndex: request.keyIndex,
                });
                const committee = await this.committeeModel.findOne({
                    committeeId: key.committeeId,
                });
                if (request.responses.length == committee.threshold) {
                    const task = await this.taskModel.findOne({
                        task: request.task,
                    });
                    const totalM = task.totalM.map((Mi) =>
                        Group.from(Mi.x, Mi.y),
                    );
                    const totalD = request.finalizedD.map((Di) =>
                        Group.from(Di.x, Di.y),
                    );
                    const accumulationStorageM =
                        this.requesterContractsService.storage(task.requester)
                            .groupVectorStorageMapping[task.taskId].M;
                    const accumulationStorageR =
                        this.requesterContractsService.storage(task.requester)
                            .groupVectorStorageMapping[task.taskId].R;
                    const rawResultStorage = new ScalarVectorStorage();
                    const rawResult = bruteForceResultVector(
                        getResultVector(totalD, totalM),
                    );
                    const groupVectorStorage = new GroupVectorStorage();
                    totalD.map((Di, index) => {
                        groupVectorStorage.updateRawLeaf(
                            { level1Index: Field(index) },
                            Di,
                        );
                    });
                    for (
                        let j = 0;
                        j < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                        j++
                    ) {
                        rawResultStorage.updateRawLeaf(
                            { level1Index: Field(j) },
                            rawResult[j],
                        );
                    }

                    let proof = await Utils.prove(
                        ComputeResult.name,
                        'init',
                        async () =>
                            ComputeResult.init(
                                new ComputeResultInput({
                                    M: Group.zero,
                                    D: Group.zero,
                                    result: Scalar.from(0),
                                }),
                                accumulationStorageM.root,
                                groupVectorStorage.root,
                                rawResultStorage.root,
                            ),
                        undefined,
                        { info: true, error: true },
                    );
                    for (
                        let j = 0;
                        j < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                        j++
                    ) {
                        const totalMi = totalM[j];
                        const totalDi = totalD[j];
                        const result = rawResult[j];

                        proof = await Utils.prove(
                            ComputeResult.name,
                            'compute',
                            async () =>
                                ComputeResult.compute(
                                    {
                                        M: totalMi,
                                        D: totalDi,
                                        result,
                                    },
                                    proof,
                                    accumulationStorageM.getWitness(Field(j)),
                                    groupVectorStorage.getWitness(Field(j)),
                                    rawResultStorage.getWitness(Field(j)),
                                ),
                            undefined,
                            { info: true, error: true },
                        );
                    }
                    const requestContract = new RequestContract(
                        PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                    );
                    const feePayerPrivateKey = PrivateKey.fromBase58(
                        process.env.FEE_PAYER_PRIVATE_KEY,
                    );
                    await Utils.proveAndSendTx(
                        RequestContract.name,
                        'update',
                        async () =>
                            requestContract.resolve(
                                proof,
                                new UInt64(request.expirationTimestamp),
                                accumulationStorageR.root,
                                this._dkgRequest.expirationStorage.getWitness(
                                    Field(request.requestId),
                                ),
                                this._dkgRequest.accumulationStorage.getWitness(
                                    Field(request.requestId),
                                ),
                                this._dkgResponse.responseStorage.getWitness(
                                    Field(request.requestId),
                                ),
                                this._dkgRequest.resultStorage.getWitness(
                                    Field(request.requestId),
                                ),
                                this._dkgRequest.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.RESPONSE,
                                    PublicKey.fromBase58(
                                        process.env.RESPONSE_ADDRESS,
                                    ),
                                ),
                            ),
                        {
                            sender: {
                                privateKey: feePayerPrivateKey,
                                publicKey: feePayerPrivateKey.toPublicKey(),
                            },
                            fee: process.env.FEE,
                            memo: '',
                            nonce: await this.queryService.fetchAccountNonce(
                                feePayerPrivateKey.toPublicKey().toBase58(),
                            ),
                        },
                        undefined,
                        undefined,
                        { info: true, error: true, memoryUsage: false },
                    );
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.log(err);
        }
    }
    // ===== PRIVATE FUNCTIONS

    private async fetchDkgRequestState(): Promise<DkgRequestState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.REQUEST_ADDRESS,
        );
        const result: DkgRequestState = {
            zkAppRoot: Field(state[0]),
            requestCounter: Field(state[1]),
            keyIndexRoot: Field(state[2]),
            taskRoot: Field(state[3]),
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

    private async fetchRequestActions() {
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
                let respondedEvents =
                    await this.responseRespondedEventModel.find(
                        {
                            'data.requestId': notProcessedEvent.data.requestId,
                            'data.memberId': memberId,
                        },
                        {},
                        { sort: { eventId: -1 } },
                    );
                respondedEvents = respondedEvents.slice(
                    0,
                    Constants.ENCRYPTION_LIMITS.FULL_DIMENSION,
                );
                respondedEvents = respondedEvents.sort(
                    (a, b) => a.data.dimensionIndex - b.data.dimensionIndex,
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
                this._dkgRequest.taskStorage.updateLeaf(
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
