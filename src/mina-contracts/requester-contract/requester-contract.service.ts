import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRequesterActionData,
    RequesterAction,
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
import {
    Field,
    Group,
    Poseidon,
    PublicKey,
    Reducer,
    UInt32,
    UInt64,
} from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import _, { last } from 'lodash';
import { Encryption, Task } from 'src/schemas/funding-task.schema';
import {
    getFullDimensionEmptyGroupVector,
    MaxRetries,
    RequesterAddresses,
    RequesterAddressMapping,
} from 'src/constants';
import { Funding } from 'src/schemas/funding.schema';
import { Utilities } from '../utilities';

@Injectable()
export class RequesterContractsService implements ContractServiceInterface {
    private readonly requesterAddresses: string[];
    private readonly logger = new Logger(RequesterContractsService.name);
    private _storageMapping: {
        [key: string]: {
            zkAppStorage: Storage.AddressStorage.AddressStorage;
            counters: Storage.RequesterStorage.RequesterCounters;
            keyIndexStorage: Storage.RequesterStorage.RequesterKeyIndexStorage;
            timestampStorage: Storage.RequesterStorage.TimestampStorage;
            accumulationStorage: Storage.RequesterStorage.RequesterAccumulationStorage;
            commitmentStorage: Storage.RequesterStorage.CommitmentStorage;
            lastTimestamp: number;
            actionState: string;
            nextCommitmentIndex: number;
            groupVectorStorageMapping: {
                [key: number]: { R: GroupVectorStorage; M: GroupVectorStorage };
            };
        };
    };

    public storage(address: string): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        counters: Storage.RequesterStorage.RequesterCounters;
        keyIndexStorage: Storage.RequesterStorage.RequesterKeyIndexStorage;
        timestampStorage: Storage.RequesterStorage.TimestampStorage;
        accumulationStorage: Storage.RequesterStorage.RequesterAccumulationStorage;
        commitmentStorage: Storage.RequesterStorage.CommitmentStorage;
        lastTimestamp: number;
        actionState: string;
        nextCommitmentIndex: number;
        groupVectorStorageMapping: {
            [key: number]: { R: GroupVectorStorage; M: GroupVectorStorage };
        };
    } {
        return this._storageMapping[address];
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(RequesterAction.name)
        private readonly requesterActionModel: Model<RequesterAction>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
    ) {
        this.requesterAddresses = RequesterAddresses;
        this._storageMapping = {};
        for (let i = 0; i < this.requesterAddresses.length; i++) {
            const requesterAddress = this.requesterAddresses[i];
            this._storageMapping[requesterAddress] = {
                zkAppStorage: Utilities.getZkAppStorageForRequester(
                    RequesterAddressMapping[requesterAddress]
                        .taskManagerAddress,
                    RequesterAddressMapping[requesterAddress].submissionAddress,
                ),
                counters: Storage.RequesterStorage.RequesterCounters.empty(),
                keyIndexStorage:
                    new Storage.RequesterStorage.RequesterKeyIndexStorage(),
                timestampStorage:
                    new Storage.RequesterStorage.TimestampStorage(),
                accumulationStorage:
                    new Storage.RequesterStorage.RequesterAccumulationStorage(),
                commitmentStorage:
                    new Storage.RequesterStorage.CommitmentStorage(),
                lastTimestamp: 0,
                actionState: '',
                nextCommitmentIndex: 0,
                groupVectorStorageMapping: {},
            };
        }
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchRequesterActions();
                await this.updateRequesterActions();
            } catch (err) {
                console.log(err);
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

    private async fetchRequesterState(
        requesterAddress: string,
    ): Promise<RequesterState> {
        const state = await this.queryService.fetchZkAppState(requesterAddress);
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
        this._storageMapping[requesterAddress].counters =
            Storage.RequesterStorage.RequesterCounters.fromFields(
                result.counters.toFields(),
            );
        this._storageMapping[requesterAddress].lastTimestamp = Number(
            result.lastTimestamp.toBigInt(),
        );
        this._storageMapping[requesterAddress].actionState =
            result.actionState.toString();
        return result;
    }

    private async fetchRequesterActions() {
        for (let i = 0; i < this.requesterAddresses.length; i++) {
            const requesterAddress = this.requesterAddresses[i];
            const lastAction = await this.requesterActionModel.findOne(
                { requester: requesterAddress },
                {},
                { sort: { actionId: -1 } },
            );
            let actions: Action[] =
                await this.queryService.fetchActions(requesterAddress);
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
                        requester: requesterAddress,
                    },
                    {
                        requester: requesterAddress,
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
    }

    private async updateRequesterActions() {
        for (let i = 0; i < this.requesterAddresses.length; i++) {
            const requesterAddress = this.requesterAddresses[i];
            await this.fetchRequesterState(requesterAddress);
            const currentAction = await this.requesterActionModel.findOne({
                requester: requesterAddress,
                currentActionState:
                    this._storageMapping[requesterAddress].actionState,
            });
            if (currentAction != undefined) {
                const notActiveActions = await this.requesterActionModel.find(
                    {
                        requester: requesterAddress,
                        actionId: { $lte: currentAction.actionId },
                        active: false,
                    },
                    {},
                    { sort: { actionId: 1 } },
                );
                const lastTask = await this.taskModel.findOne(
                    { requester: requesterAddress },
                    {},
                    { sort: { taskId: -1 } },
                );
                let nextTaskId = 0;
                if (lastTask != undefined) {
                    nextTaskId = lastTask.taskId + 1;
                }
                for (let i = 0; i < notActiveActions.length; i++) {
                    const notActiveAction = notActiveActions[i];
                    notActiveAction.set('active', true);
                    if (
                        notActiveAction.actionData.taskId ==
                        Number(UInt32.MAXINT().toBigint())
                    ) {
                        await this.taskModel.create({
                            task: Poseidon.hash(
                                [
                                    PublicKey.fromBase58(
                                        requesterAddress,
                                    ).toFields(),
                                    Field(nextTaskId),
                                ].flat(),
                            ).toString(),
                            requester: requesterAddress,
                            taskId: nextTaskId,
                            timestamp: notActiveAction.actionData.timestamp,
                            keyIndex: notActiveAction.actionData.keyIndex,
                            totalR: getFullDimensionEmptyGroupVector(),
                            totalM: getFullDimensionEmptyGroupVector(),
                        });

                        nextTaskId += 1;
                    } else {
                        const task = await this.taskModel.findOne({
                            requester: requesterAddress,
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
                        task.commitmentCounter += 1;
                        const newTotalR: { x: string; y: string }[] =
                            getFullDimensionEmptyGroupVector();
                        const newTotalM: { x: string; y: string }[] =
                            getFullDimensionEmptyGroupVector();
                        for (
                            let j = 0;
                            j < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                            j++
                        ) {
                            const oldR = task.totalR[j];
                            const newR = Group.from(oldR.x, oldR.y).add(
                                Group.from(
                                    encryption.R[j].x,
                                    encryption.R[j].y,
                                ),
                            );
                            newTotalR[j].x = newR.x.toString();
                            newTotalR[j].y = newR.y.toString();

                            const oldM = task.totalM[j];
                            const newM = Group.from(oldM.x, oldM.y).add(
                                Group.from(
                                    encryption.M[j].x,
                                    encryption.M[j].y,
                                ),
                            );
                            newTotalM[j].x = newM.x.toString();
                            newTotalM[j].y = newM.y.toString();
                        }
                        task.set('totalR', newTotalR);
                        task.set('totalM', newTotalM);
                        await task.save();
                    }
                    await notActiveAction.save();
                }
            }
        }
    }

    async updateMerkleTrees() {
        for (let i = 0; i < this.requesterAddresses.length; i++) {
            const requesterAddress = this.requesterAddresses[i];
            const tasks = await this.taskModel.find(
                { requester: requesterAddress },
                {},
                { sort: { taskId: 1 } },
            );
            let nextCommitmentIndex = 0;
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                const level1Index = this._storageMapping[
                    requesterAddress
                ].keyIndexStorage.calculateLevel1Index(Field(task.taskId));
                this._storageMapping[
                    requesterAddress
                ].keyIndexStorage.updateLeaf(
                    { level1Index },
                    Field(task.keyIndex),
                );
                this._storageMapping[
                    requesterAddress
                ].timestampStorage.updateLeaf(
                    { level1Index },
                    Field(task.timestamp),
                );
                const groupVectorStorageR = new GroupVectorStorage();
                const groupVectorStorageM = new GroupVectorStorage();
                for (
                    let j = 0;
                    j < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                    j++
                ) {
                    const level2Index = Field(j);
                    groupVectorStorageR.updateLeaf(
                        { level1Index: level2Index },
                        groupVectorStorageR.calculateLeaf(
                            Group.from(task.totalR[j].x, task.totalR[j].y),
                        ),
                    );
                    groupVectorStorageM.updateLeaf(
                        { level1Index: level2Index },
                        groupVectorStorageM.calculateLeaf(
                            Group.from(task.totalM[j].x, task.totalM[j].y),
                        ),
                    );
                }
                this._storageMapping[
                    requesterAddress
                ].groupVectorStorageMapping[Number(level1Index.toBigInt())] = {
                    R: groupVectorStorageR,
                    M: groupVectorStorageM,
                };
                this._storageMapping[
                    requesterAddress
                ].accumulationStorage.updateLeaf(
                    { level1Index },
                    this._storageMapping[
                        requesterAddress
                    ].accumulationStorage.calculateLeaf({
                        accumulationRootR: groupVectorStorageR.root,
                        accumulationRootM: groupVectorStorageM.root,
                    }),
                );
            }
            const activeActions = await this.requesterActionModel.find(
                { requester: requesterAddress, active: true },
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
                        this._storageMapping[
                            requesterAddress
                        ].commitmentStorage.updateLeaf(
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
            this._storageMapping[requesterAddress].counters = requesterCounters;
        }
    }
}
