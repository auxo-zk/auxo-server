import {
    Injectable,
    OnModuleInit,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { AppService } from 'src/app.service';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import {
    CommitteeAction,
    getCommitteeActionData,
} from 'src/schemas/actions/committee-action.schema';
import {
    CommitteeContract,
    Storage,
    UpdateCommittee,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Ipfs } from 'src/ipfs/ipfs';
import { MaxRetries, ZkAppCache } from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { CommitteeState } from 'src/interfaces/zkapp-state.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { error } from 'console';
import * as _ from 'lodash';
import { Constants } from '@auxo-dev/platform';
import { Utils } from '@auxo-dev/auxo-libs';

@Injectable()
export class CommitteeContractService implements ContractServiceInterface {
    private readonly logger = new Logger(CommitteeContractService.name);
    private _nextCommitteeId: number;
    private _memberStorage: Storage.CommitteeStorage.MemberStorage;
    private _settingStorage: Storage.CommitteeStorage.SettingStorage;
    private _zkAppStorage: Storage.AddressStorage.AddressStorage;
    private _actionState: string;

    public get memberStorage(): Storage.CommitteeStorage.MemberStorage {
        return this._memberStorage;
    }

    public get settingStorage(): Storage.CommitteeStorage.SettingStorage {
        return this._settingStorage;
    }

    public get zkAppStorage(): Storage.AddressStorage.AddressStorage {
        return this._zkAppStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._nextCommitteeId = 0;
        this._actionState = '';
        this._memberStorage = new Storage.CommitteeStorage.MemberStorage();
        this._settingStorage = new Storage.CommitteeStorage.SettingStorage();
        this._zkAppStorage = Utilities.getZkAppStorageForDkg();
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            // await this.compile();
            // await this.rollup();
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
                await this.fetchCommitteeActions();
                await this.updateCommittees();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = ZkAppCache;
        await UpdateCommittee.compile({ cache });
        await CommitteeContract.compile({ cache });
    }

    async getNextUpdateCommitteeJob(): Promise<string | undefined> {
        try {
            const notActiveActions = await this.committeeActionModel.find(
                {
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                return notActiveActions[0].previousActionState;
            }
        } catch (err) {
            console.log(err);
        }
    }

    async processUpdateCommitteeJob(jobId: string) {
        try {
            const notActiveActions = await this.committeeActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (
                notActiveActions.length == 0 ||
                notActiveActions[0].previousActionState != jobId
            )
                throw new Error('Invalid action id');
            const state = await this.fetchCommitteeState();

            let proof = await Utils.prove(
                UpdateCommittee.name,
                'init',
                async () =>
                    UpdateCommittee.init(
                        state.actionState,
                        state.memberRoot,
                        state.settingRoot,
                        state.nextCommitteeId,
                    ),
                undefined,
                { info: true, error: true },
            );
            const memberStorage = _.cloneDeep(this._memberStorage);
            const settingStorage = _.cloneDeep(this._settingStorage);
            let nextCommitteeId = state.nextCommitteeId;
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];

                proof = await Utils.prove(
                    UpdateCommittee.name,
                    'update',
                    async () =>
                        UpdateCommittee.update(
                            proof,
                            ZkApp.Committee.CommitteeAction.fromFields(
                                Utilities.stringArrayToFields(
                                    notActiveAction.actions,
                                ),
                            ),
                            memberStorage.getLevel1Witness(nextCommitteeId),
                            settingStorage.getLevel1Witness(nextCommitteeId),
                        ),
                    undefined,
                    { info: true, error: true },
                );
                memberStorage.updateInternal(
                    nextCommitteeId,
                    Storage.CommitteeStorage.COMMITTEE_LEVEL_2_TREE(),
                );
                settingStorage.updateRawLeaf(
                    {
                        level1Index: nextCommitteeId,
                    },
                    {
                        T: Field(notActiveAction.actionData.threshold),
                        N: Field(notActiveAction.actionData.addresses.length),
                    },
                );
                for (
                    let j = 0;
                    j < notActiveAction.actionData.addresses.length;
                    j++
                ) {
                    const level2Index = memberStorage.calculateLevel2Index(
                        Field(j),
                    );
                    memberStorage.updateRawLeaf(
                        {
                            level1Index: nextCommitteeId,
                            level2Index: level2Index,
                        },
                        PublicKey.fromBase58(
                            notActiveAction.actionData.addresses[j],
                        ),
                    );
                }
                nextCommitteeId = nextCommitteeId.add(1);
            }
            const committeeContract = new CommitteeContract(
                PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            await Utils.proveAndSendTx(
                CommitteeContract.name,
                'update',
                async () => committeeContract.update(proof),
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

    async rollup() {
        try {
            const notActiveActions = await this.committeeActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                const state = await this.fetchCommitteeState();

                let proof = await Utils.prove(
                    UpdateCommittee.name,
                    'init',
                    async () =>
                        UpdateCommittee.init(
                            state.actionState,
                            state.memberRoot,
                            state.settingRoot,
                            state.nextCommitteeId,
                        ),
                    undefined,
                    { info: true, error: true },
                );
                const memberStorage = _.cloneDeep(this._memberStorage);
                const settingStorage = _.cloneDeep(this._settingStorage);
                let nextCommitteeId = state.nextCommitteeId;
                for (let i = 0; i < notActiveActions.length; i++) {
                    const notActiveAction = notActiveActions[i];

                    proof = await Utils.prove(
                        UpdateCommittee.name,
                        'update',
                        async () =>
                            UpdateCommittee.update(
                                proof,
                                ZkApp.Committee.CommitteeAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notActiveAction.actions,
                                    ),
                                ),
                                memberStorage.getLevel1Witness(nextCommitteeId),
                                settingStorage.getLevel1Witness(
                                    nextCommitteeId,
                                ),
                            ),
                        undefined,
                        { info: true, error: true },
                    );
                    memberStorage.updateInternal(
                        nextCommitteeId,
                        Storage.CommitteeStorage.COMMITTEE_LEVEL_2_TREE(),
                    );
                    settingStorage.updateRawLeaf(
                        {
                            level1Index: nextCommitteeId,
                        },
                        {
                            T: Field(notActiveAction.actionData.threshold),
                            N: Field(
                                notActiveAction.actionData.addresses.length,
                            ),
                        },
                    );
                    for (
                        let j = 0;
                        j < notActiveAction.actionData.addresses.length;
                        j++
                    ) {
                        const level2Index = memberStorage.calculateLevel2Index(
                            Field(j),
                        );
                        memberStorage.updateRawLeaf(
                            {
                                level1Index: nextCommitteeId,
                                level2Index: level2Index,
                            },
                            PublicKey.fromBase58(
                                notActiveAction.actionData.addresses[j],
                            ),
                        );
                    }
                    nextCommitteeId = nextCommitteeId.add(1);
                }
                const committeeContract = new CommitteeContract(
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                await Utils.proveAndSendTx(
                    CommitteeContract.name,
                    'update',
                    async () => committeeContract.update(proof),
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

    // ============ PRIVATE FUNCTIONS ============

    private async fetchCommitteeState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const result: CommitteeState = {
            zkAppRoot: Field(state[0]),
            nextCommitteeId: Field(state[1]),
            memberRoot: Field(state[2]),
            settingRoot: Field(state[3]),
            feeRoot: Field(state[4]),
            feeReceiverRoot: Field(state[5]),
            actionState: Field(state[6]),
        };
        this._nextCommitteeId = Number(result.nextCommitteeId.toBigInt());
        this._actionState = result.actionState.toString();
        return result;
    }

    private async fetchCommitteeActions(): Promise<void> {
        const lastAction = await this.committeeActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.COMMITTEE_ADDRESS,
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
            const actionData = getCommitteeActionData(action.actions[0]);
            await this.committeeActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
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

    private async updateCommittees() {
        await this.fetchCommitteeState();
        const currentAction = await this.committeeActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.committeeActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );

            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                const ipfsData = await this.ipfs.getData(
                    notActiveAction.actionData.ipfsHash,
                );

                this.committeeModel
                    .findOneAndUpdate(
                        {
                            committeeId: notActiveAction.actionId,
                        },
                        {
                            committeeId: notActiveAction.actionId,
                            threshold: notActiveAction.actionData.threshold,
                            numberOfMembers:
                                notActiveAction.actionData.addresses.length,
                            publicKeys: notActiveAction.actionData.addresses,
                            ipfsData: ipfsData,
                        },
                        { new: true, upsert: true },
                    )
                    .then(async () => {
                        await notActiveAction.save();
                    });
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const committees = await this.committeeModel.find();
            for (let i = 0; i < committees.length; i++) {
                const committee = committees[i];
                const level1Index = this._memberStorage.calculateLevel1Index(
                    Field(committee.committeeId),
                );
                this._memberStorage.updateInternal(
                    level1Index,
                    Storage.CommitteeStorage.COMMITTEE_LEVEL_2_TREE(),
                );
                this._settingStorage.updateRawLeaf(
                    {
                        level1Index: level1Index,
                    },
                    {
                        T: Field(committee.threshold),
                        N: Field(committee.numberOfMembers),
                    },
                );
                for (let j = 0; j < committee.publicKeys.length; j++) {
                    const level2Index =
                        this._memberStorage.calculateLevel2Index(Field(j));
                    this._memberStorage.updateRawLeaf(
                        {
                            level1Index: level1Index,
                            level2Index: level2Index,
                        },
                        PublicKey.fromBase58(committee.publicKeys[j]),
                    );
                }
            }
        } catch (err) {}
    }
}
