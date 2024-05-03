import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRequesterActionData,
    FundingRequesterAction,
} from 'src/schemas/actions/funding-requester-action.schema';
import { Model } from 'mongoose';
import { Storage } from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { RequesterState } from 'src/interfaces/zkapp-state.interface';
import { Field, Reducer, UInt32 } from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import _, { last } from 'lodash';
import { FundingTask } from 'src/schemas/funding-task.schema';
import { MaxRetries } from 'src/constants';

@Injectable()
export class FundingRequesterContractService
    implements ContractServiceInterface
{
    private readonly requesterAddress: string;
    private readonly logger = new Logger(FundingRequesterContractService.name);
    private readonly _zkAppStorage: Storage.AddressStorage.AddressStorage;
    private counters: number;
    private readonly _keyIndexStorage: Storage.RequesterStorage.RequesterKeyIndexStorage;
    private readonly _timestampStorage: Storage.RequesterStorage.TimestampStorage;
    private readonly _accumulationStorage: Storage.RequesterStorage.RequesterAccumulationStorage;
    private readonly _commitmentStorage: Storage.RequesterStorage.CommitmentStorage;
    private lastTimestamp: number;
    private actionState: string;

    public get zkAppStorage(): Storage.AddressStorage.AddressStorage {
        return this._zkAppStorage;
    }

    public get keyIndexStorage(): Storage.RequesterStorage.RequesterKeyIndexStorage {
        return this._keyIndexStorage;
    }

    public get timestampStorage(): Storage.RequesterStorage.TimestampStorage {
        return this._timestampStorage;
    }

    public get accumulationStorage(): Storage.RequesterStorage.RequesterAccumulationStorage {
        return this._accumulationStorage;
    }

    public get commitmentStorage(): Storage.RequesterStorage.CommitmentStorage {
        return this._commitmentStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(FundingRequesterAction.name)
        private readonly requesterActionModel: Model<FundingRequesterAction>,
        @InjectModel(FundingTask.name)
        private readonly fundingTaskModel: Model<FundingTask>,
    ) {
        this.requesterAddress = '';
        this.counters = 0;
        this.lastTimestamp = 0;
        this.actionState = '';

        this._zkAppStorage = new Storage.AddressStorage.AddressStorage();
        this._keyIndexStorage =
            new Storage.RequesterStorage.RequesterKeyIndexStorage();
        this._timestampStorage =
            new Storage.RequesterStorage.TimestampStorage();
        this._accumulationStorage =
            new Storage.RequesterStorage.RequesterAccumulationStorage();
        this._commitmentStorage =
            new Storage.RequesterStorage.CommitmentStorage();
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchRequesterActions();
                await this.updateRequesterActions();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }
    async updateMerkleTrees() {
        throw new Error('Method not implemented.');
    }

    async update() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {
            console.log(err);
        }
    }

    private async fetchRequesterState(): Promise<RequesterState> {
        const state = await this.queryService.fetchZkAppState(
            this.requesterAddress,
        );
        const result: RequesterState = {
            zkAppRoot: Field(state[0]),
            counters: Field(state[1]),
            keyIndexRoot: Field(state[2]),
            timestampRoot: Field(state[3]),
            accumulationRoot: Field(state[4]),
            commitmentRoot: Field(state[5]),
            lastTimestamp: Field(state[6]),
            actionState: Field(state[7]),
        };
        this.counters = Number(result.counters.toBigInt());
        this.lastTimestamp = Number(result.lastTimestamp.toBigInt());
        this.actionState = result.actionState.toString();
        return result;
    }

    private async fetchRequesterActions() {
        const lastAction = await this.requesterActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            this.requesterAddress,
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
            const actionData = getRequesterActionData(action.actions[0]);
            await this.requesterActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    actionHash: action.hash,
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

    private async updateRequesterActions() {
        await this.fetchRequesterState();
        const currentAction = await this.requesterActionModel.findOne({
            currentActionState: this.actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.requesterActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            const lastTask = await this.fundingTaskModel.findOne(
                {},
                {},
                { sort: { taskId: -1 } },
            );
            let nextTaskId = 0;
            if (lastTask != undefined) {
                nextTaskId = lastTask.taskId + 1;
            }
            for (let i = 0; i < notActiveActions.length; i++) {
                const promises = [];
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                promises.push(notActiveAction.save());
                if (
                    notActiveAction.actionData.taskId ==
                    Number(UInt32.MAXINT().toBigint())
                ) {
                    promises.push(
                        this.fundingTaskModel.create({
                            taskId: nextTaskId,
                            timestamp: notActiveAction.actionData.timestamp,
                            keyIndex: notActiveAction.actionData.keyIndex,
                            indices: notActiveAction.actionData.indices,
                            R: notActiveAction.actionData.R,
                            M: notActiveAction.actionData.M,
                            commitments: notActiveAction.actionData.commitments,
                        }),
                    );
                    nextTaskId += 1;
                } else {
                    const task = await this.fundingTaskModel.findOne({
                        taskId: notActiveAction.actionData.taskId,
                    });
                    task.set('indices', notActiveAction.actionData.indices);
                    task.set('R', notActiveAction.actionData.R);
                    task.set('M', notActiveAction.actionData.M);
                    task.set(
                        'commitments',
                        notActiveAction.actionData.commitments,
                    );
                    promises.push(notActiveAction.save());
                }

                await Promise.all(promises);
            }
        }
    }
}
