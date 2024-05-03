import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRequesterActionData,
    FundingRequesterAction,
} from 'src/schemas/actions/funding-requester-action.schema';
import { Model } from 'mongoose';
import {
    calculateKeyIndex,
    Constants,
    GroupVectorStorage,
    Libs,
    Storage,
} from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { RequesterState } from 'src/interfaces/zkapp-state.interface';
import { Field, Group, Reducer, UInt32, UInt64 } from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import _, { last } from 'lodash';
import { Encryption, FundingTask } from 'src/schemas/funding-task.schema';
import { MaxRetries } from 'src/constants';
import { Funding } from 'src/schemas/funding.schema';

@Injectable()
export class FundingRequesterContractService
    implements ContractServiceInterface
{
    private readonly requesterAddress: string;
    private readonly logger = new Logger(FundingRequesterContractService.name);
    private readonly _zkAppStorage: Storage.AddressStorage.AddressStorage;
    private _counters: Storage.RequesterStorage.RequesterCounters;
    private readonly _keyIndexStorage: Storage.RequesterStorage.RequesterKeyIndexStorage;
    private readonly _timestampStorage: Storage.RequesterStorage.TimestampStorage;
    private readonly _accumulationStorage: Storage.RequesterStorage.RequesterAccumulationStorage;
    private readonly _commitmentStorage: Storage.RequesterStorage.CommitmentStorage;
    private _lastTimestamp: number;
    private _actionState: string;
    private _nextCommitmentIndex: number;

    public get zkAppStorage(): Storage.AddressStorage.AddressStorage {
        return this._zkAppStorage;
    }

    public get counters(): Storage.RequesterStorage.RequesterCounters {
        return this._counters;
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
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
    ) {
        this.requesterAddress = '';
        this._counters = Storage.RequesterStorage.RequesterCounters.empty();
        this._lastTimestamp = 0;
        this._actionState = '';
        this._nextCommitmentIndex = 0;

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
        this._counters = Storage.RequesterStorage.RequesterCounters.fromFields(
            result.counters.toFields(),
        );
        this._lastTimestamp = Number(result.lastTimestamp.toBigInt());
        this._actionState = result.actionState.toString();
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
            currentActionState: this._actionState,
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
            const emptyGroupVector: { x: string; y: string }[] = [];
            for (let i = 0; i < Constants.ENCRYPTION_LIMITS.DIMENSION; i++) {
                emptyGroupVector.push({
                    x: Group.zero.x.toString(),
                    y: Group.zero.y.toString(),
                });
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
                            totalR: emptyGroupVector,
                            totalM: emptyGroupVector,
                        }),
                    );
                    nextTaskId += 1;
                } else {
                    const task = await this.fundingTaskModel.findOne({
                        taskId: notActiveAction.actionData.taskId,
                    });
                    const encryption = new Encryption(
                        notActiveAction.actionData.timestamp,
                        notActiveAction.actionData.indices,
                        notActiveAction.actionData.R,
                        notActiveAction.actionData.M,
                        notActiveAction.actionData.commitments,
                    );
                    task.encryptions.push(encryption);
                    task.commitmentCounter += encryption.commitments.length;
                    const newTotalR: { x: string; y: string }[] = [];
                    const newTotalM: { x: string; y: string }[] = [];
                    for (
                        let j = 0;
                        j < Constants.ENCRYPTION_LIMITS.DIMENSION;
                        j++
                    ) {
                        const oldR = task.totalR[j];
                        const newR = Group.from(oldR.x, oldR.y).add(
                            Group.from(
                                notActiveAction.actionData.R[j].x,
                                notActiveAction.actionData.R[j].y,
                            ),
                        );
                        newTotalR.push({
                            x: newR.x.toString(),
                            y: newR.y.toString(),
                        });

                        const oldM = task.totalM[j];
                        const newM = Group.from(oldM.x, oldM.y).add(
                            Group.from(
                                notActiveAction.actionData.M[j].x,
                                notActiveAction.actionData.M[j].y,
                            ),
                        );
                        newTotalM.push({
                            x: newM.x.toString(),
                            y: newM.y.toString(),
                        });
                    }
                    task.set('totalR', newTotalR);
                    task.set('totalM', newTotalM);
                    promises.push(notActiveAction.save());
                }

                await Promise.all(promises);
            }
        }
    }

    async updateMerkleTrees() {
        const tasks = await this.fundingTaskModel.find(
            {},
            {},
            { sort: { taskId: 1 } },
        );
        let nextCommitmentIndex = 0;
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const level1Index = this._keyIndexStorage.calculateLevel1Index(
                Field(task.taskId),
            );
            this._keyIndexStorage.updateLeaf(
                { level1Index },
                Field(task.keyIndex),
            );
            this._timestampStorage.updateLeaf(
                { level1Index },
                Field(task.timestamp),
            );
            const groupVectorStorageR = new GroupVectorStorage();
            const groupVectorStorageM = new GroupVectorStorage();
            for (let j = 0; j < Constants.ENCRYPTION_LIMITS.DIMENSION; j++) {
                groupVectorStorageR.updateLeaf(
                    { level1Index: Field(j) },
                    groupVectorStorageR.calculateLeaf(
                        Group.from(task.totalR[j].x, task.totalR[j].y),
                    ),
                );
                groupVectorStorageM.updateLeaf(
                    { level1Index: Field(j) },
                    groupVectorStorageM.calculateLeaf(
                        Group.from(task.totalM[j].x, task.totalM[j].y),
                    ),
                );
            }
            this._accumulationStorage.updateLeaf(
                { level1Index },
                this._accumulationStorage.calculateLeaf({
                    accumulationRootR: groupVectorStorageR.root,
                    accumulationRootM: groupVectorStorageM.root,
                }),
            );
        }

        const activeActions = await this.requesterActionModel.find(
            { active: true },
            {},
            { sort: { actionId: 1 } },
        );
        for (let i = 0; i < activeActions.length; i++) {
            const activeAction = activeActions[i];
            if (
                activeAction.actionData.taskId !=
                Number(UInt32.MAXINT().toBigint())
            ) {
                for (
                    let j = 0;
                    j < activeAction.actionData.commitments.length;
                    j++
                ) {
                    this._commitmentStorage.updateLeaf(
                        { level1Index: Field(nextCommitmentIndex) },
                        Field(activeAction.actionData.commitments[j]),
                    );
                    nextCommitmentIndex += 1;
                }
            }
        }
        const requesterCounters =
            new Storage.RequesterStorage.RequesterCounters({
                taskCounter: new UInt32(tasks.length),
                commitmentCounter: new UInt64(nextCommitmentIndex),
            });
        this._counters = requesterCounters;
    }
}
