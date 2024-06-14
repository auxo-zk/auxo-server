import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRequesterActionData,
    RequesterAction,
} from 'src/schemas/actions/requester-action.schema';
import { Model } from 'mongoose';
import {
    calculateKeyIndex,
    CommitmentWitnesses,
    Constants,
    GroupVector,
    GroupVectorStorage,
    GroupVectorWitnesses,
    Libs,
    RequesterContract,
    Storage,
    UpdateTask,
    ZkApp,
} from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { RequesterState } from 'src/interfaces/zkapp-state.interface';
import {
    Field,
    Group,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    UInt32,
    UInt64,
} from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import _, { last } from 'lodash';
import { Encryption, Task } from 'src/schemas/task.schema';
import {
    getFullDimensionEmptyGroupVector,
    MaxRetries,
    RequesterAddresses,
    RequesterAddressMapping,
    ZkAppCache,
} from 'src/constants';
import { Funding } from 'src/schemas/funding.schema';
import { Utilities } from '../utilities';
import { Utils } from '@auxo-dev/auxo-libs';

export class RequesterContractStorage {
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

    constructor(zkAppStorage: Storage.AddressStorage.AddressStorage) {
        this.zkAppStorage = zkAppStorage;
        this.counters = Storage.RequesterStorage.RequesterCounters.empty();
        this.keyIndexStorage =
            new Storage.RequesterStorage.RequesterKeyIndexStorage();
        this.timestampStorage = new Storage.RequesterStorage.TimestampStorage();
        this.accumulationStorage =
            new Storage.RequesterStorage.RequesterAccumulationStorage();
        this.commitmentStorage =
            new Storage.RequesterStorage.CommitmentStorage();
        this.lastTimestamp = 0;
        this.actionState = '';
        this.nextCommitmentIndex = 0;
        this.groupVectorStorageMapping = {};
    }
}
@Injectable()
export class RequesterContractsService implements ContractServiceInterface {
    private readonly requesterAddresses: string[];
    private readonly logger = new Logger(RequesterContractsService.name);
    private _storageMapping: { [key: string]: RequesterContractStorage };

    public storage(requesterAddress: string): RequesterContractStorage {
        return this._storageMapping[requesterAddress];
    }

    public getTaskManager(requesterAddress: string): string {
        return RequesterAddressMapping[requesterAddress].taskManagerAddress;
    }

    public getSubmission(requesterAddress: string): string {
        return RequesterAddressMapping[requesterAddress].submissionAddress;
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
            this._storageMapping[requesterAddress] =
                new RequesterContractStorage(
                    Utilities.getZkAppStorageForRequester(
                        RequesterAddressMapping[requesterAddress]
                            .taskManagerAddress,
                        RequesterAddressMapping[requesterAddress]
                            .submissionAddress,
                    ),
                );
        }
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchRequesterActions();
                await this.updateRequesterActions();
                count = MaxRetries;
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
            // Provable.log(
            //     await this.fetchRequesterState(this.requesterAddresses[0]),
            // );
            // Provable.log(this.storage(this.requesterAddresses[0]).counters);
            // Provable.log(
            //     this.storage(this.requesterAddresses[0]).keyIndexStorage.root,
            // );
            // Provable.log(
            //     this.storage(this.requesterAddresses[0]).timestampStorage.root,
            // );
            // Provable.log(
            //     this.storage(this.requesterAddresses[0]).accumulationStorage
            //         .root,
            // );
            // Provable.log(
            //     this.storage(this.requesterAddresses[0]).commitmentStorage.root,
            // );
            // await this.compile();
            // await this.rollup();
        } catch (err) {
            console.log(err);
        }
    }

    async compile() {
        const cache = ZkAppCache;
        await UpdateTask.compile({ cache });
        await RequesterContract.compile({ cache });
    }

    async getNextUpdateTaskJobs(): Promise<Array<string>> {
        const jobIds: Array<string> = [];
        try {
            for (
                let index = 0;
                index < this.requesterAddresses.length;
                index++
            ) {
                const requesterAddress = this.requesterAddresses[index];
                const notActiveActions = await this.requesterActionModel.find(
                    { active: false, requester: requesterAddress },
                    {},
                    { sort: { actionId: 1 } },
                );
                if (notActiveActions.length > 0) {
                    jobIds.push(
                        `${notActiveActions[0].previousActionState}-${requesterAddress}`,
                    );
                }
            }
        } catch (err) {
            console.log(err);
            return [];
        }
        return jobIds;
    }

    async processUpdateTaskJob(combinedId: string): Promise<boolean> {
        try {
            const [previousActionState, requester] = combinedId.split('-');
            const notActiveActions = await this.requesterActionModel.find(
                { active: false, requester },
                {},
                { sort: { actionId: 1 } },
            );

            if (
                notActiveActions.length == 0 ||
                notActiveActions[0].previousActionState != previousActionState
            )
                throw new Error('Incorrect previous action state!');

            const state = await this.fetchRequesterState(requester);
            let proof = await Utils.prove(
                UpdateTask.name,
                'init',
                async () =>
                    UpdateTask.init(
                        ZkApp.Requester.RequesterAction.empty(),
                        state.actionState,
                        new UInt32(
                            this._storageMapping[
                                requester
                            ].counters.taskCounter,
                        ),
                        state.keyIndexRoot,
                        state.timestampRoot,
                        state.accumulationRoot,
                        this._storageMapping[requester].counters
                            .commitmentCounter,
                        state.commitmentRoot,
                    ),
                undefined,
                { info: true, error: true },
            );
            const counters = _.cloneDeep(
                this._storageMapping[requester].counters,
            );
            const keyIndexStorage = _.cloneDeep(
                this._storageMapping[requester].keyIndexStorage,
            );
            const timestampStorage = _.cloneDeep(
                this._storageMapping[requester].timestampStorage,
            );
            const accumulationStorage = _.cloneDeep(
                this._storageMapping[requester].accumulationStorage,
            );
            const commitmentStorage = _.cloneDeep(
                this._storageMapping[requester].commitmentStorage,
            );
            const groupVectorStorageMapping = _.cloneDeep(
                this._storageMapping[requester].groupVectorStorageMapping,
            );
            let nextTaskId = Field.fromFields(counters.taskCounter.toFields());
            let nextCommitmentIndex = Field.fromFields(
                counters.commitmentCounter.toFields(),
            );
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                if (
                    notActiveAction.actionData.taskId ==
                    Number(UInt32.MAXINT().toBigint())
                ) {
                    proof = await UpdateTask.create(
                        ZkApp.Requester.RequesterAction.fromFields(
                            Utilities.stringArrayToFields(
                                notActiveAction.actions,
                            ),
                        ),
                        proof,
                        keyIndexStorage.getLevel1Witness(nextTaskId),
                        timestampStorage.getLevel1Witness(nextTaskId),
                        accumulationStorage.getLevel1Witness(nextTaskId),
                    );
                    keyIndexStorage.updateLeaf(
                        { level1Index: nextTaskId },
                        Field(notActiveAction.actionData.keyIndex),
                    );
                    timestampStorage.updateLeaf(
                        { level1Index: nextTaskId },
                        Field(notActiveAction.actionData.timestamp),
                    );
                    const groupVectorStorageR = new GroupVectorStorage();
                    const groupVectorStorageM = new GroupVectorStorage();
                    accumulationStorage.updateLeaf(
                        { level1Index: nextTaskId },
                        accumulationStorage.calculateLeaf({
                            accumulationRootR: groupVectorStorageR.root,
                            accumulationRootM: groupVectorStorageM.root,
                        }),
                    );
                    groupVectorStorageMapping[Number(nextTaskId.toBigInt())] = {
                        R: groupVectorStorageR,
                        M: groupVectorStorageM,
                    };
                    nextTaskId = nextTaskId.add(1);
                } else {
                    if (
                        groupVectorStorageMapping[
                            notActiveAction.actionData.taskId
                        ] == undefined
                    ) {
                        groupVectorStorageMapping[
                            notActiveAction.actionData.taskId
                        ] = {
                            R: new GroupVectorStorage(),
                            M: new GroupVectorStorage(),
                        };
                    }
                    const oldSumR: Group[] = [];
                    const oldSumM: Group[] = [];
                    const dimensionIndexes: number[] = [];
                    for (
                        let j = 0;
                        j < Constants.ENCRYPTION_LIMITS.DIMENSION;
                        j++
                    ) {
                        const dimensionIndex = Number(
                            Field.fromBits(
                                Field(notActiveAction.actionData.indices)
                                    .toBits()
                                    .slice(j * 8, (j + 1) * 8),
                            ).toBigInt(),
                        );
                        dimensionIndexes.push(dimensionIndex);
                        if (
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].R.leafs[dimensionIndex.toString()] == undefined
                        ) {
                            oldSumR.push(Group.zero);
                            oldSumM.push(Group.zero);
                        } else {
                            oldSumR.push(
                                groupVectorStorageMapping[
                                    notActiveAction.actionData.taskId
                                ].R.leafs[dimensionIndex.toString()]
                                    ? groupVectorStorageMapping[
                                          notActiveAction.actionData.taskId
                                      ].R.leafs[dimensionIndex.toString()].raw
                                    : Group.zero,
                            );
                            oldSumM.push(
                                groupVectorStorageMapping[
                                    notActiveAction.actionData.taskId
                                ].M.leafs[dimensionIndex.toString()]
                                    ? groupVectorStorageMapping[
                                          notActiveAction.actionData.taskId
                                      ].M.leafs[dimensionIndex.toString()].raw
                                    : Group.zero,
                            );
                        }
                    }
                    const groupVectorOldSumR: GroupVector = new GroupVector(
                        oldSumR,
                    );
                    const groupVectorOldSumM: GroupVector = new GroupVector(
                        oldSumM,
                    );
                    const accumulationWitnessesR = new GroupVectorWitnesses();
                    const accumulationWitnessesM = new GroupVectorWitnesses();
                    const commitmentWitnesses = new CommitmentWitnesses();
                    for (
                        let j = 0;
                        j < Constants.ENCRYPTION_LIMITS.DIMENSION;
                        j++
                    ) {
                        const dimensionIndex = dimensionIndexes[j];
                        accumulationWitnessesR.set(
                            Field(j),
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].R.getWitness(Field(dimensionIndex)),
                        );
                        accumulationWitnessesM.set(
                            Field(j),
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].M.getWitness(Field(dimensionIndex)),
                        );
                        if (
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].R.leafs[dimensionIndex.toString()] == undefined
                        ) {
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].R.updateRawLeaf(
                                {
                                    level1Index: Field(dimensionIndex),
                                },
                                Group.from(
                                    notActiveAction.actionData.R[j].x,
                                    notActiveAction.actionData.R[j].y,
                                ),
                            );
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].M.updateRawLeaf(
                                {
                                    level1Index: Field(dimensionIndex),
                                },
                                Group.from(
                                    notActiveAction.actionData.M[j].x,
                                    notActiveAction.actionData.M[j].y,
                                ),
                            );
                        } else {
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].R.updateRawLeaf(
                                {
                                    level1Index: Field(dimensionIndex),
                                },
                                Group.from(
                                    notActiveAction.actionData.R[j].x,
                                    notActiveAction.actionData.R[j].y,
                                ).add(
                                    groupVectorStorageMapping[
                                        notActiveAction.actionData.taskId
                                    ].R.leafs[dimensionIndex.toString()].raw,
                                ),
                            );
                            groupVectorStorageMapping[
                                notActiveAction.actionData.taskId
                            ].M.updateRawLeaf(
                                {
                                    level1Index: Field(dimensionIndex),
                                },
                                Group.from(
                                    notActiveAction.actionData.M[j].x,
                                    notActiveAction.actionData.M[j].y,
                                ).add(
                                    groupVectorStorageMapping[
                                        notActiveAction.actionData.taskId
                                    ].M.leafs[dimensionIndex.toString()].raw,
                                ),
                            );
                        }
                        commitmentWitnesses.set(
                            Field(j),
                            commitmentStorage.getWitness(nextCommitmentIndex),
                        );
                        commitmentStorage.updateRawLeaf(
                            {
                                level1Index: nextCommitmentIndex,
                            },
                            Field(notActiveAction.actionData.commitments[j]),
                        );
                        nextCommitmentIndex = nextCommitmentIndex.add(1);
                    }
                    proof = await Utils.prove(
                        UpdateTask.name,
                        'accumulate',
                        async () =>
                            UpdateTask.accumulate(
                                ZkApp.Requester.RequesterAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notActiveAction.actions,
                                    ),
                                ),
                                proof,
                                groupVectorOldSumR,
                                groupVectorOldSumM,
                                accumulationStorage.getLevel1Witness(
                                    Field(notActiveAction.actionData.taskId),
                                ),
                                accumulationWitnessesR,
                                accumulationWitnessesM,
                                commitmentWitnesses,
                            ),
                        undefined,
                        { info: true, error: true },
                    );
                    accumulationStorage.updateLeaf(
                        {
                            level1Index: Field(
                                notActiveAction.actionData.taskId,
                            ),
                        },
                        accumulationStorage.calculateLeaf({
                            accumulationRootR:
                                groupVectorStorageMapping[
                                    notActiveAction.actionData.taskId
                                ].R.root,
                            accumulationRootM:
                                groupVectorStorageMapping[
                                    notActiveAction.actionData.taskId
                                ].M.root,
                        }),
                    );
                }
            }
            const requesterContract = new RequesterContract(
                PublicKey.fromBase58(requester),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            await Utils.proveAndSendTx(
                RequesterContract.name,
                'updateTasks',
                async () => requesterContract.updateTasks(proof),
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
        } catch (err) {
            console.log(err);
            return false;
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
                        task.commitmentCounter +=
                            Constants.ENCRYPTION_LIMITS.DIMENSION;
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
                const level1Index = Field(task.taskId);
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
                    const totalR = Group.from(
                        task.totalR[j].x,
                        task.totalR[j].y,
                    );
                    totalR.equals(Group.zero).toBoolean()
                        ? 0
                        : groupVectorStorageR.updateRawLeaf(
                              { level1Index: level2Index },
                              totalR,
                          );
                    const totalM = Group.from(
                        task.totalM[j].x,
                        task.totalM[j].y,
                    );
                    totalM.equals(Group.zero).toBoolean()
                        ? 0
                        : groupVectorStorageM.updateRawLeaf(
                              { level1Index: level2Index },
                              totalM,
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
