import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel, raw } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    RequestAction,
    getRequestActionData,
} from 'src/schemas/actions/request-action.schema';
import { QueryService } from '../query/query.service';
import {
    Field,
    Group,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { RawDkgRequest } from 'src/schemas/raw-request.schema';
import {
    getResponseActionData,
    ResponseAction,
} from 'src/schemas/actions/response-action.schema';
import { DkgResponse } from 'src/schemas/response.schema';
import {
    ActionReduceStatusEnum,
    MaxRetries,
    RequestActionEnum,
    RequestEventEnum,
    RequestStatusEnum,
    ZkAppEnum,
    zkAppCache,
} from 'src/constants';
import { Event } from 'src/interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';
import { ResponseContributionStorage, Storage, ZkApp } from '@auxo-dev/dkg';
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

@Injectable()
export class DkgUsageContractsService implements ContractServiceInterface {
    private logger = new Logger(DkgUsageContractsService.name);

    private _dkgRequest: {
        zkApp: Storage.AddressStorage.AddressStorage;
        requesterCounter: number;
        keyIndex: Storage.RequestStorage.RequestKeyIndexStorage;
        taskId: Storage.RequestStorage.TaskIdStorage;
        accumulation: Storage.RequestStorage.RequestAccumulationStorage;
        expiration: Storage.RequestStorage.ExpirationStorage;
        result: Storage.RequestStorage.ResultStorage;
        actionState: string;
    };

    private _dkgResponse: {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.ResponseContributionStorage;
        response: Storage.DKGStorage.ResponseStorage;
        processRoot: string;
    };

    public get dkgRequest(): {
        zkApp: Storage.AddressStorage.AddressStorage;
        requesterCounter: number;
        keyIndex: Storage.RequestStorage.RequestKeyIndexStorage;
        taskId: Storage.RequestStorage.TaskIdStorage;
        accumulation: Storage.RequestStorage.RequestAccumulationStorage;
        expiration: Storage.RequestStorage.ExpirationStorage;
        result: Storage.RequestStorage.ResultStorage;
        actionState: string;
    } {
        return this._dkgRequest;
    }

    public get dkgResponse(): {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.ResponseContributionStorage;
        response: Storage.DKGStorage.ResponseStorage;
        processRoot: string;
    } {
        return this._dkgResponse;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly committeeContractService: CommitteeContractService,
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
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._dkgRequest = {
            zkApp: new Storage.AddressStorage.AddressStorage(),
            requesterCounter: 0,
            keyIndex: new Storage.RequestStorage.RequestKeyIndexStorage(),
            taskId: new Storage.RequestStorage.TaskIdStorage(),
            accumulation:
                new Storage.RequestStorage.RequestAccumulationStorage(),
            expiration: new Storage.RequestStorage.ExpirationStorage(),
            result: new Storage.RequestStorage.ResultStorage(),
            actionState: '',
        };

        this._dkgResponse = {
            zkApp: new Storage.AddressStorage.AddressStorage(),
            contribution: new Storage.DKGStorage.ResponseContributionStorage(),
            response: new Storage.DKGStorage.ResponseStorage(),
            processRoot: '',
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
                count = MaxRetries;
            } catch (err) {
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
            processRoot: Field(state[2]),
        };
        this._dkgResponse.processRoot = result.processRoot.toString();
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
            const actionData = getRequestActionData(action.actions[0]);
            await this.requestActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState.toString(),
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

    private async updateRequestActions() {
        await this.fetchDkgRequestState();
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
            for (let i = 0; i < notActiveActions.length; i++) {
                const promises = [];
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                promises.push(notActiveAction.save());

                await Promise.all(promises);
            }
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
            const actionData = getResponseActionData(action.actions[0]);
            await this.responseActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState.toString(),
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

    async updateMerkleTrees() {
        try {
            //
        } catch (err) {}
    }
}
