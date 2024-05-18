import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    fetchAccount,
    Field,
    Group,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    UInt8,
} from 'o1js';
import { Model } from 'mongoose';
import {
    DkgAction,
    getDkgActionData,
} from 'src/schemas/actions/dkg-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
    Round1Action,
    getRound1ActionData,
} from 'src/schemas/actions/round-1-action.schema';
import {
    getRound2ActionData,
    Round2Action,
} from 'src/schemas/actions/round-2-action.schema';
import { Key } from 'src/schemas/key.schema';
import {
    BatchEncryption,
    calculateKeyIndex,
    calculatePublicKey,
    Constants,
    DKG_LEVEL_2_TREE,
    DkgContract,
    EncryptionHashArray,
    FinalizeRound1,
    FinalizeRound1Input,
    FinalizeRound2,
    FinalizeRound2Input,
    Libs,
    Round1Contract,
    Round1Contribution,
    Round2Contract,
    Storage,
    UpdateKey,
    UpdateKeyInput,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Bit255, Utils } from '@auxo-dev/auxo-libs';
import { Committee } from 'src/schemas/committee.schema';
import {
    ActionReduceStatusEnum,
    DkgActionEnum,
    DkgEventEnum,
    EventEnum,
    KeyStatusEnum,
    MaxRetries,
    ZkAppCache,
    ZkAppIndex,
} from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { Event } from 'src/interfaces/event.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import {
    DkgState,
    Round1State,
    Round2State,
} from 'src/interfaces/zkapp-state.interface';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import * as _ from 'lodash';
import { RollupAction } from 'src/schemas/actions/rollup-action.schema';
import {
    DkgEvent,
    getDkgEventData,
} from 'src/schemas/actions/dkg-event.schema';
import {
    getRound1EventData,
    Round1Event,
} from 'src/schemas/actions/round-1-event.schema';
import {
    getRound2EventData,
    Round2Event,
} from 'src/schemas/actions/round-2-event.schema';
import { RollupContractService } from '../rollup-contract/rollup-contract.service';

@Injectable()
export class DkgContractsService implements ContractServiceInterface {
    private readonly logger = new Logger(DkgContractsService.name);
    private _dkg: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        keyCounterStorage: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatusStorage: Storage.DKGStorage.KeyStatusStorage;
        keyStorage: Storage.DKGStorage.KeyStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    };
    private _round1: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.Round1ContributionStorage;
        publicKeyStorage: Storage.DKGStorage.PublicKeyStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    };
    private _round2: {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.Round2ContributionStorage;
        encryptionStorage: Storage.DKGStorage.EncryptionStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    };

    public get dkg(): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        keyCounterStorage: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatusStorage: Storage.DKGStorage.KeyStatusStorage;
        keyStorage: Storage.DKGStorage.KeyStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
    } {
        return this._dkg;
    }

    public get round1(): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.Round1ContributionStorage;
        publicKeyStorage: Storage.DKGStorage.PublicKeyStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    } {
        return this._round1;
    }

    public get round2(): {
        zkAppStorage: Storage.AddressStorage.AddressStorage;
        contributionStorage: Storage.DKGStorage.Round2ContributionStorage;
        encryptionStorage: Storage.DKGStorage.EncryptionStorage;
        processStorage: Storage.ProcessStorage.ProcessStorage;
        processStorageMapping: { [key: string]: number };
    } {
        return this._round2;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly committeeContractService: CommitteeContractService,
        private readonly rollupContractService: RollupContractService,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(DkgEvent.name)
        private readonly dkgEventModel: Model<DkgEvent>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1Event.name)
        private readonly round1EventModel: Model<Round1Event>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2Event.name)
        private readonly round2EventModel: Model<Round2Event>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(RollupAction.name)
        private readonly rollupActionModel: Model<RollupAction>,
    ) {
        this._dkg = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            keyCounterStorage: new Storage.CommitteeStorage.KeyCounterStorage(),
            keyStatusStorage: new Storage.DKGStorage.KeyStatusStorage(),
            keyStorage: new Storage.DKGStorage.KeyStorage(),
            processStorage: new Storage.ProcessStorage.ProcessStorage(),
            processStorageMapping: {},
        };
        this._round1 = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            contributionStorage:
                new Storage.DKGStorage.Round1ContributionStorage(),
            publicKeyStorage: new Storage.DKGStorage.PublicKeyStorage(),
            processStorage: new Storage.ProcessStorage.ProcessStorage(),
            processStorageMapping: {},
        };
        this._round2 = {
            zkAppStorage: Utilities.getZkAppStorageForDkg(),
            contributionStorage:
                new Storage.DKGStorage.Round2ContributionStorage(),
            encryptionStorage: new Storage.DKGStorage.EncryptionStorage(),
            processStorage: new Storage.ProcessStorage.ProcessStorage(),
            processStorageMapping: {},
        };
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            await this.rollupContractService.compile();
            await this.compile();
            // await this.rollupDkg();
            await this.rollupRound1();
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
                await this.fetchDkgActions();
                await this.fetchRound1Actions();
                await this.fetchRound2Actions();
                await this.updateDkgActions();
                await this.updateRound1Actions();
                await this.updateRound2Actions();
                count = MaxRetries;
            } catch (err) {
                console.log(err);
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = ZkAppCache;
        await UpdateKey.compile({ cache });
        await DkgContract.compile({ cache });
        await FinalizeRound1.compile({ cache });
        await Round1Contract.compile({ cache });
        // await FinalizeRound2.compile({ cache });
        // await BatchEncryption.compile({ cache });
        // await Round2Contract.compile({ cache });
    }

    async rollupDkg() {
        try {
            const notActiveActions = await this.dkgActionModel.find(
                { active: false },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                const state = await this.fetchDkgState();

                const keyCounterStorage = _.cloneDeep(
                    this._dkg.keyCounterStorage,
                );
                const keyStatusStorage = _.cloneDeep(
                    this._dkg.keyStatusStorage,
                );
                const keyStorage = _.cloneDeep(this._dkg.keyStorage);
                const processStorage = _.cloneDeep(this._dkg.processStorage);
                const processStorageMapping = _.cloneDeep(
                    this._dkg.processStorageMapping,
                );
                const rollupStorage = _.cloneDeep(
                    this.rollupContractService.rollupStorage,
                );
                const nextKeyIdMapping: {
                    [committeeId: number]: number;
                } = {};
                let proof = await UpdateKey.init(
                    UpdateKeyInput.empty(),
                    rollupStorage.root,
                    state.keyCounterRoot,
                    state.keyStatusRoot,
                    state.keyRoot,
                    state.processRoot,
                );
                for (let i = 0; i < notActiveActions.length; i++) {
                    const notActiveAction = notActiveActions[i];
                    const committeeId = notActiveAction.actionData.committeeId;
                    if (nextKeyIdMapping[committeeId] == undefined) {
                        const lastKeyByCommitteeId =
                            await this.keyModel.findOne(
                                {
                                    committeeId: committeeId,
                                },
                                {},
                                { sort: { keyId: -1 } },
                            );
                        if (lastKeyByCommitteeId != undefined) {
                            nextKeyIdMapping[committeeId] =
                                lastKeyByCommitteeId.keyId + 1;
                        } else {
                            nextKeyIdMapping[committeeId] = 0;
                        }
                    }
                    const dkgAction = ZkApp.DKG.DkgAction.fromFields(
                        Utilities.stringArrayToFields(notActiveAction.actions),
                    );
                    switch (notActiveAction.actionData.actionEnum) {
                        case DkgActionEnum.GENERATE_KEY:
                            const nextKeyId = Field(
                                nextKeyIdMapping[
                                    notActiveAction.actionData.committeeId
                                ],
                            );
                            proof = await UpdateKey.generate(
                                {
                                    previousActionState: Field(
                                        notActiveAction.previousActionState,
                                    ),
                                    action: dkgAction,
                                    actionId: Field(notActiveAction.actionId),
                                },
                                proof,
                                nextKeyId,
                                keyCounterStorage.getLevel1Witness(
                                    Field(committeeId),
                                ),
                                keyStatusStorage.getLevel1Witness(
                                    keyStatusStorage.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: nextKeyId,
                                    }),
                                ),
                                rollupStorage.getWitness(
                                    rollupStorage.calculateLevel1Index({
                                        zkAppIndex: Field(ZkAppIndex.DKG),
                                        actionId: Field(
                                            notActiveAction.actionId,
                                        ),
                                    }),
                                ),
                                processStorage.getWitness(
                                    Field(notActiveAction.actionId),
                                ),
                            );
                            keyCounterStorage.updateLeaf(
                                { level1Index: Field(committeeId) },
                                nextKeyId,
                            );
                            keyStatusStorage.updateLeaf(
                                {
                                    level1Index:
                                        keyStatusStorage.calculateLevel1Index({
                                            committeeId: Field(committeeId),
                                            keyId: nextKeyId,
                                        }),
                                },
                                Field(KeyStatusEnum.ROUND_1_CONTRIBUTION),
                            );
                            nextKeyIdMapping[
                                notActiveAction.actionData.committeeId
                            ] += 1;
                            break;
                        case DkgActionEnum.FINALIZE_ROUND_1:
                            await UpdateKey.update(
                                {
                                    previousActionState: Field(
                                        notActiveAction.previousActionState,
                                    ),
                                    action: dkgAction,
                                    actionId: Field(notActiveAction.actionId),
                                },
                                proof,
                                keyStatusStorage.getLevel1Witness(
                                    keyStatusStorage.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(
                                            notActiveAction.actionData.keyId,
                                        ),
                                    }),
                                ),
                                keyStorage.getLevel1Witness(
                                    keyStorage.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(
                                            notActiveAction.actionData.keyId,
                                        ),
                                    }),
                                ),
                                rollupStorage.getWitness(
                                    rollupStorage.calculateLevel1Index({
                                        zkAppIndex: Field(ZkAppIndex.DKG),
                                        actionId: Field(
                                            notActiveAction.actionId,
                                        ),
                                    }),
                                ),
                                processStorage.getWitness(
                                    Field(notActiveAction.actionId),
                                ),
                            );
                            keyStatusStorage.updateLeaf(
                                {
                                    level1Index:
                                        keyStatusStorage.calculateLevel1Index({
                                            committeeId: Field(committeeId),
                                            keyId: nextKeyId,
                                        }),
                                },
                                Field(KeyStatusEnum.ROUND_2_CONTRIBUTION),
                            );
                            keyStorage.updateLeaf(
                                {
                                    level1Index:
                                        keyStorage.calculateLevel1Index({
                                            committeeId: Field(committeeId),
                                            keyId: nextKeyId,
                                        }),
                                },
                                keyStorage.calculateLeaf(
                                    PublicKey.fromBase58(
                                        notActiveAction.actionData.key,
                                    ).toGroup(),
                                ),
                            );
                            break;
                        case DkgActionEnum.FINALIZE_ROUND_2:
                            await UpdateKey.update(
                                {
                                    previousActionState: Field(
                                        notActiveAction.previousActionState,
                                    ),
                                    action: dkgAction,
                                    actionId: Field(notActiveAction.actionId),
                                },
                                proof,
                                keyStatusStorage.getLevel1Witness(
                                    keyStatusStorage.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(
                                            notActiveAction.actionData.keyId,
                                        ),
                                    }),
                                ),
                                keyStorage.getLevel1Witness(
                                    keyStorage.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(
                                            notActiveAction.actionData.keyId,
                                        ),
                                    }),
                                ),
                                rollupStorage.getWitness(
                                    rollupStorage.calculateLevel1Index({
                                        zkAppIndex: Field(ZkAppIndex.DKG),
                                        actionId: Field(
                                            notActiveAction.actionId,
                                        ),
                                    }),
                                ),
                                processStorage.getWitness(
                                    Field(notActiveAction.actionId),
                                ),
                            );
                            keyStatusStorage.updateLeaf(
                                {
                                    level1Index:
                                        keyStatusStorage.calculateLevel1Index({
                                            committeeId: Field(committeeId),
                                            keyId: nextKeyId,
                                        }),
                                },
                                Field(KeyStatusEnum.ACTIVE),
                            );

                            break;
                        case DkgActionEnum.DEPRECATE_KEY:
                            break;
                    }
                    rollupStorage.updateLeaf(
                        {
                            level1Index: rollupStorage.calculateLevel1Index({
                                zkAppIndex: Field(ZkAppIndex.DKG),
                                actionId: Field(notActiveAction.actionId),
                            }),
                        },
                        dkgAction.hash(),
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
                            level1Index: Field(notActiveAction.actionId),
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
                const dkgContract = new DkgContract(
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                await Utils.proveAndSendTx(
                    DkgContract.name,
                    'update',
                    async () => {
                        await dkgContract.update(
                            proof,
                            this._dkg.zkAppStorage.getZkAppRef(
                                ZkAppIndex.ROLLUP,
                                PublicKey.fromBase58(
                                    process.env.ROLLUP_ADDRESS,
                                ),
                            ),
                        );
                    },
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

    async rollupRound1() {
        try {
            const keys = await this.keyModel.find({
                status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
            });
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const committee = await this.committeeModel.findOne({
                    committeeId: key.committeeId,
                });
                const notActiveActions = await this.round1ActionModel.find(
                    {
                        'actionData.keyId': key.keyId,
                        'actionData.committeeId': key.committeeId,
                        active: false,
                    },
                    {},
                    { sort: { 'actionData.memberId': 1 } },
                );
                if (notActiveActions.length == committee.numberOfMembers) {
                    const state = await this.fetchRound1State();
                    const contributionStorage = _.cloneDeep(
                        this._round1.contributionStorage,
                    );
                    const publicKeyStorage = _.cloneDeep(
                        this._round1.publicKeyStorage,
                    );
                    const processStorage = _.cloneDeep(
                        this._round1.processStorage,
                    );
                    const processStorageMapping = _.cloneDeep(
                        this._round1.processStorageMapping,
                    );
                    const rollupStorage = _.cloneDeep(
                        this.rollupContractService.rollupStorage,
                    );
                    let proof = await FinalizeRound1.init(
                        FinalizeRound1Input.empty(),
                        rollupStorage.root,
                        Field(committee.threshold),
                        Field(committee.numberOfMembers),
                        state.contributionRoot,
                        state.publicKeyRoot,
                        state.processRoot,
                        Field(key.keyIndex),
                        contributionStorage.getLevel1Witness(
                            Field(key.keyIndex),
                        ),
                        publicKeyStorage.getLevel1Witness(Field(key.keyIndex)),
                    );
                    contributionStorage.updateInternal(
                        Field(key.keyIndex),
                        DKG_LEVEL_2_TREE(),
                    );
                    publicKeyStorage.updateInternal(
                        Field(key.keyIndex),
                        DKG_LEVEL_2_TREE(),
                    );
                    for (let j = 0; j < notActiveActions.length; j++) {
                        const notActiveAction = notActiveActions[j];
                        const round1Action =
                            ZkApp.Round1.Round1Action.fromFields(
                                Utilities.stringArrayToFields(
                                    notActiveAction.actions,
                                ),
                            );
                        proof = await FinalizeRound1.contribute(
                            {
                                previousActionState: Field(
                                    notActiveAction.previousActionState,
                                ),
                                action: round1Action,
                                actionId: Field(notActiveAction.actionId),
                            },
                            proof,
                            contributionStorage.getWitness(
                                Field(key.keyIndex),
                                Field(notActiveAction.actionData.memberId),
                            ),
                            publicKeyStorage.getWitness(
                                Field(key.keyIndex),
                                Field(notActiveAction.actionData.memberId),
                            ),
                            rollupStorage.getWitness(
                                rollupStorage.calculateLevel1Index({
                                    zkAppIndex: Field(ZkAppIndex.ROUND1),
                                    actionId: Field(notActiveAction.actionId),
                                }),
                            ),
                            processStorage.getWitness(
                                Field(notActiveAction.actionId),
                            ),
                        );

                        const contribution: Group[] =
                            notActiveAction.actionData.contribution.map(
                                (point) => Group.from(point.x, point.y),
                            );
                        contributionStorage.updateRawLeaf(
                            {
                                level1Index: Field(key.keyIndex),
                                level2Index: Field(
                                    notActiveAction.actionData.memberId,
                                ),
                            },
                            new Round1Contribution({
                                C: Libs.Committee.CArray.from(contribution),
                            }),
                        );
                        publicKeyStorage.updateRawLeaf(
                            {
                                level1Index: Field(key.keyIndex),
                                level2Index: Field(
                                    notActiveAction.actionData.memberId,
                                ),
                            },
                            contribution[0],
                        );
                        rollupStorage.updateLeaf(
                            {
                                level1Index: rollupStorage.calculateLevel1Index(
                                    {
                                        zkAppIndex: Field(ZkAppIndex.ROUND1),
                                        actionId: Field(
                                            notActiveAction.actionId,
                                        ),
                                    },
                                ),
                            },
                            round1Action.hash(),
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
                                level1Index: Field(notActiveAction.actionId),
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
                    const round1Contract = new Round1Contract(
                        PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                    );
                    const feePayerPrivateKey = PrivateKey.fromBase58(
                        process.env.FEE_PAYER_PRIVATE_KEY,
                    );
                    await Utils.proveAndSendTx(
                        Round1Contract.name,
                        'finalize',
                        async () => {
                            await round1Contract.finalize(
                                proof,
                                this.committeeContractService.settingStorage.getLevel1Witness(
                                    Field(key.committeeId),
                                ),
                                this._dkg.keyStatusStorage.getLevel1Witness(
                                    Field(key.keyIndex),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.COMMITTEE,
                                    PublicKey.fromBase58(
                                        process.env.COMMITTEE_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.DKG,
                                    PublicKey.fromBase58(
                                        process.env.DKG_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.ROLLUP,
                                    PublicKey.fromBase58(
                                        process.env.ROLLUP_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.ROUND1,
                                    PublicKey.fromBase58(
                                        process.env.ROUND_1_ADDRESS,
                                    ),
                                ),
                            );
                        },
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
        } catch (err) {
            console.log(err);
        }
    }

    async rollupRound2() {
        try {
            const keys = await this.keyModel.find({
                status: KeyStatusEnum.ROUND_2_CONTRIBUTION,
            });
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const committee = await this.committeeModel.findOne({
                    committeeId: key.committeeId,
                });
                const notActiveActions = await this.round2ActionModel.find(
                    {
                        'actionData.keyId': key.keyId,
                        'actionData.committeeId': key.committeeId,
                        active: false,
                    },
                    {},
                    { sort: { 'actionData.memberId': 1 } },
                );
                if (notActiveActions.length == committee.numberOfMembers) {
                    const state = await this.fetchRound2State();
                    const contributionStorage = _.cloneDeep(
                        this._round2.contributionStorage,
                    );
                    const encryptionStorage = _.cloneDeep(
                        this._round2.encryptionStorage,
                    );
                    const processStorage = _.cloneDeep(
                        this._round2.processStorage,
                    );
                    const processStorageMapping = _.cloneDeep(
                        this._round2.processStorageMapping,
                    );
                    const rollupStorage = _.cloneDeep(
                        this.rollupContractService.rollupStorage,
                    );
                    let proof = await FinalizeRound2.init(
                        FinalizeRound2Input.empty(),
                        rollupStorage.root,
                        Field(committee.threshold),
                        Field(committee.numberOfMembers),
                        state.contributionRoot,
                        state.processRoot,
                        Field(key.keyIndex),
                        new EncryptionHashArray(
                            [...Array(committee.numberOfMembers)].map(() =>
                                Field(0),
                            ),
                        ),
                        contributionStorage.getLevel1Witness(
                            Field(key.keyIndex),
                        ),
                    );
                    const contributionsRaw = notActiveActions.map(
                        (notActiveAction) =>
                            notActiveAction.actionData.contribution,
                    );
                    const contributions: Libs.Committee.Round2Contribution[] =
                        [];
                    for (let j = 0; j < notActiveActions.length; j++) {
                        const round2 = notActiveActions[j].actionData;
                        const c: Bit255[] = round2.contribution.c.map((value) =>
                            Bit255.fromBigInt(BigInt(value)),
                        );
                        const u: Group[] = round2.contribution.u.map((point) =>
                            Group.from(point.x, point.y),
                        );
                        contributions.push(
                            new Libs.Committee.Round2Contribution({
                                c: Libs.Committee.cArray.from(c),
                                U: Libs.Committee.UArray.from(u),
                            }),
                        );
                    }
                    for (let j = 0; j < notActiveActions.length; j++) {
                        const notActiveAction = notActiveActions[j];
                        const round2Action =
                            ZkApp.Round2.Round2Action.fromFields(
                                Utilities.stringArrayToFields(
                                    notActiveAction.actions,
                                ),
                            );
                        proof = await FinalizeRound2.contribute(
                            {
                                previousActionState: Field(
                                    notActiveAction.previousActionState,
                                ),
                                action: round2Action,
                                actionId: Field(notActiveAction.actionId),
                            },
                            proof,
                            contributionStorage.getWitness(
                                Field(key.keyIndex),
                                Field(notActiveAction.actionData.memberId),
                            ),
                            rollupStorage.getWitness(
                                rollupStorage.calculateLevel1Index({
                                    zkAppIndex: Field(ZkAppIndex.ROUND2),
                                    actionId: Field(notActiveAction.actionId),
                                }),
                            ),
                            processStorage.getWitness(
                                Field(notActiveAction.actionId),
                            ),
                        );
                        contributionStorage.updateRawLeaf(
                            {
                                level1Index: Field(key.keyIndex),
                                level2Index: Field(
                                    notActiveAction.actionData.memberId,
                                ),
                            },
                            contributions[j],
                        );
                        rollupStorage.updateLeaf(
                            {
                                level1Index: rollupStorage.calculateLevel1Index(
                                    {
                                        zkAppIndex: Field(ZkAppIndex.ROUND2),
                                        actionId: Field(
                                            notActiveAction.actionId,
                                        ),
                                    },
                                ),
                            },
                            round2Action.hash(),
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
                                level1Index: Field(notActiveAction.actionId),
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
                    const round2Contract = new Round2Contract(
                        PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                    );
                    const feePayerPrivateKey = PrivateKey.fromBase58(
                        process.env.FEE_PAYER_PRIVATE_KEY,
                    );
                    const tx = await Mina.transaction(
                        {
                            sender: feePayerPrivateKey.toPublicKey(),
                            fee: process.env.FEE,
                            nonce: await this.queryService.fetchAccountNonce(
                                feePayerPrivateKey.toPublicKey().toBase58(),
                            ),
                        },
                        async () => {
                            await round2Contract.finalize(
                                proof,
                                encryptionStorage.getLevel1Witness(
                                    Field(key.keyIndex),
                                ),
                                this.committeeContractService.settingStorage.getLevel1Witness(
                                    Field(key.committeeId),
                                ),
                                this._dkg.keyStatusStorage.getLevel1Witness(
                                    Field(key.keyIndex),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.COMMITTEE,
                                    PublicKey.fromBase58(
                                        process.env.COMMITTEE_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.DKG,
                                    PublicKey.fromBase58(
                                        process.env.DKG_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.ROLLUP,
                                    PublicKey.fromBase58(
                                        process.env.ROLLUP_ADDRESS,
                                    ),
                                ),
                                this._dkg.zkAppStorage.getZkAppRef(
                                    ZkAppIndex.ROUND2,
                                    PublicKey.fromBase58(
                                        process.env.ROUND_2_ADDRESS,
                                    ),
                                ),
                            );
                        },
                    );
                    await Utilities.proveAndSend(
                        tx,
                        feePayerPrivateKey,
                        false,
                        this.logger,
                    );
                    return true;
                }
            }
        } catch (err) {}
    }

    // ============ PRIVATE FUNCTIONS ============
    private async fetchDkgState(): Promise<DkgState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.DKG_ADDRESS,
        );
        const result: DkgState = {
            zkAppRoot: Field(state[0]),
            keyCounterRoot: Field(state[1]),
            keyStatusRoot: Field(state[2]),
            keyRoot: Field(state[3]),
            processRoot: Field(state[4]),
        };
        return result;
    }

    private async fetchRound1State(): Promise<Round1State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_1_ADDRESS,
        );
        const result: Round1State = {
            zkAppRoot: Field(state[0]),
            contributionRoot: Field(state[1]),
            publicKeyRoot: Field(state[2]),
            processRoot: Field(state[3]),
        };
        return result;
    }

    private async fetchRound2State(): Promise<Round2State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_2_ADDRESS,
        );
        const result: Round2State = {
            zkAppRoot: Field(state[0]),
            contributionRoot: Field(state[1]),
            encryptionRoot: Field(state[2]),
            processRoot: Field(state[3]),
        };
        return result;
    }

    private async fetchDkgActions() {
        const lastAction = await this.dkgActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.DKG_ADDRESS,
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
            const actionData = getDkgActionData(action.actions[0]);
            await this.dkgActionModel.findOneAndUpdate(
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

    private async fetchDkgEvents() {
        const lastEvent = await this.dkgEventModel.findOne(
            {},
            {},
            { sort: { eventId: -1 } },
        );
        let events: Event[] = await this.queryService.fetchEvents(
            process.env.DKG_ADDRESS,
        );
        let eventId: number;
        if (!lastEvent) {
            eventId = 0;
        } else {
            events = events.slice(lastEvent.eventId + 1);
            eventId = lastEvent.eventId + 1;
        }
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            await this.dkgEventModel.findOneAndUpdate(
                {
                    eventId: eventId,
                },
                {
                    eventId: eventId,
                    rawData: event.events[0].data,
                    data: getDkgEventData(event.events[0].data),
                },
                { new: true, upsert: true },
            );
            eventId += 1;
        }
    }

    private async fetchRound1Actions() {
        const lastAction = await this.round1ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_1_ADDRESS,
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
            const actionData = getRound1ActionData(action.actions[0]);
            await this.round1ActionModel.findOneAndUpdate(
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

    private async fetchRound1Events() {
        const lastEvent = await this.round1EventModel.findOne(
            {},
            {},
            { sort: { eventId: -1 } },
        );
        let events: Event[] = await this.queryService.fetchEvents(
            process.env.ROUND_1_ADDRESS,
        );
        let eventId: number;
        if (!lastEvent) {
            eventId = 0;
        } else {
            events = events.slice(lastEvent.eventId + 1);
            eventId = lastEvent.eventId + 1;
        }
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            await this.round1EventModel.findOneAndUpdate(
                {
                    eventId: eventId,
                },
                {
                    eventId: eventId,
                    rawData: event.events[0].data,
                    data: getRound1EventData(event.events[0].data),
                },
                { new: true, upsert: true },
            );
            eventId += 1;
        }
    }

    private async fetchRound2Actions() {
        const lastAction = await this.round2ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_2_ADDRESS,
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
            const actionData = getRound2ActionData(action.actions[0]);
            await this.round2ActionModel.findOneAndUpdate(
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

    private async fetchRound2Events() {
        const lastEvent = await this.round2EventModel.findOne(
            {},
            {},
            { sort: { eventId: -1 } },
        );
        let events: Event[] = await this.queryService.fetchEvents(
            process.env.ROUND_2_ADDRESS,
        );
        let eventId: number;
        if (!lastEvent) {
            eventId = 0;
        } else {
            events = events.slice(lastEvent.eventId + 1);
            eventId = lastEvent.eventId + 1;
        }
        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            await this.round2EventModel.findOneAndUpdate(
                {
                    eventId: eventId,
                },
                {
                    eventId: eventId,
                    rawData: event.events[0].data,
                    data: getRound2EventData(event.events[0].data),
                },
                { new: true, upsert: true },
            );
            eventId += 1;
        }
    }

    private async updateDkgActions() {
        await this.fetchDkgState();
        await this.fetchDkgEvents();

        const notActiveActions = await this.dkgActionModel.find(
            {
                active: false,
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notActiveActions.length > 0) {
            const nextKeyIdMapping: {
                [committeeId: number]: number;
            } = {};
            for (let i = 0; i < notActiveActions.length; i++) {
                const promises = [];
                const notActiveAction = notActiveActions[i];
                const exist = await this.dkgEventModel.exists({
                    data: { $in: [notActiveAction.currentActionState] },
                });
                if (exist) {
                    notActiveAction.set('active', true);
                    const committeeId = notActiveAction.actionData.committeeId;
                    if (nextKeyIdMapping[committeeId] == undefined) {
                        const lastKeyByCommitteeId =
                            await this.keyModel.findOne(
                                {
                                    committeeId: committeeId,
                                },
                                {},
                                { sort: { keyId: -1 } },
                            );
                        if (lastKeyByCommitteeId != undefined) {
                            nextKeyIdMapping[committeeId] =
                                lastKeyByCommitteeId.keyId + 1;
                        } else {
                            nextKeyIdMapping[committeeId] = 0;
                        }
                    }
                    switch (notActiveAction.actionData.actionEnum) {
                        case DkgActionEnum.GENERATE_KEY: {
                            const keyIndex = Utilities.getKeyIndex(
                                committeeId,
                                nextKeyIdMapping[committeeId],
                            );
                            promises.push(
                                this.keyModel.create({
                                    keyIndex: keyIndex,
                                    committeeId: committeeId,
                                    keyId: nextKeyIdMapping[committeeId],
                                    status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
                                }),
                            );
                            nextKeyIdMapping[committeeId] += 1;
                            break;
                        }
                        case DkgActionEnum.FINALIZE_ROUND_1: {
                            const keyIndex = Utilities.getKeyIndex(
                                committeeId,
                                notActiveAction.actionData.keyId,
                            );
                            const key = await this.keyModel.findOne({
                                keyIndex: keyIndex,
                            });
                            key.set(
                                'status',
                                KeyStatusEnum.ROUND_2_CONTRIBUTION,
                            );
                            key.set('key', notActiveAction.actionData.key);
                            promises.push(key.save());
                            break;
                        }
                        case DkgActionEnum.FINALIZE_ROUND_2: {
                            const keyIndex = Utilities.getKeyIndex(
                                committeeId,
                                notActiveAction.actionData.keyId,
                            );
                            const key = await this.keyModel.findOne({
                                keyIndex: keyIndex,
                            });
                            key.set('status', KeyStatusEnum.ACTIVE);
                            promises.push(key.save());
                            break;
                        }
                        case DkgActionEnum.DEPRECATE_KEY: {
                            const keyIndex = Utilities.getKeyIndex(
                                committeeId,
                                notActiveAction.actionData.keyId,
                            );
                            const key = await this.keyModel.findOne({
                                keyIndex: keyIndex,
                            });
                            key.set('status', KeyStatusEnum.DEPRECATED);
                            promises.push(key.save());
                            break;
                        }
                    }
                    await Promise.all(promises);
                    await notActiveAction.save();
                } else {
                    break;
                }
            }
        }
    }

    private async updateRound1Actions() {
        await this.fetchRound1State();
        await this.fetchRound1Events();

        const notActiveActions = await this.round1ActionModel.find(
            {
                active: false,
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notActiveActions.length > 0) {
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                const exist = await this.round1EventModel.exists({
                    data: {
                        $in: [notActiveAction.currentActionState],
                    },
                });
                if (exist) {
                    notActiveAction.set('active', true);
                    const keyIndex = Utilities.getKeyIndex(
                        notActiveAction.actionData.committeeId,
                        notActiveAction.actionData.keyId,
                    );
                    const key = await this.keyModel.findOne({
                        keyIndex: keyIndex,
                    });
                    key.round1s.push({
                        memberId: notActiveAction.actionData.memberId,
                        contribution: notActiveAction.actionData.contribution,
                    });
                    key.save().then(async () => {
                        await notActiveAction.save();
                    });
                } else {
                    break;
                }
            }
        }
    }

    private async updateRound2Actions() {
        await this.fetchRound2State();
        await this.fetchRound2Events();

        const notActiveActions = await this.round2ActionModel.find(
            {
                active: false,
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notActiveActions.length > 0) {
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                const exist = await this.round2EventModel.exists({
                    data: { $in: [notActiveAction.currentActionState] },
                });
                if (exist) {
                    notActiveAction.set('active', true);
                    const keyIndex = Utilities.getKeyIndex(
                        notActiveAction.actionData.committeeId,
                        notActiveAction.actionData.keyId,
                    );
                    const key = await this.keyModel.findOne({
                        keyIndex: keyIndex,
                    });
                    key.round2s.push({
                        memberId: notActiveAction.actionData.memberId,
                        contribution: notActiveAction.actionData.contribution,
                    });
                    key.save().then(async () => {
                        await notActiveAction.save();
                    });
                } else {
                    break;
                }
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const committees = await this.committeeModel.find(
                {},
                {},
                { sort: { committeeId: 1 } },
            );
            for (let i = 0; i < committees.length; i++) {
                const committee = committees[i];
                const keys = await this.keyModel.find(
                    {
                        committeeId: committee.committeeId,
                    },
                    {},
                    { sort: { keyId: 1 } },
                );
                this._dkg.keyCounterStorage.updateRawLeaf(
                    {
                        level1Index:
                            this._dkg.keyCounterStorage.calculateLevel1Index(
                                Field(committee.committeeId),
                            ),
                    },
                    Field(keys.length),
                );
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j];
                    const level1Index =
                        this._dkg.keyStatusStorage.calculateLevel1Index({
                            committeeId: Field(committee.committeeId),
                            keyId: Field(key.keyId),
                        });
                    this._dkg.keyStatusStorage.updateRawLeaf(
                        { level1Index },
                        Field(key.status),
                    );
                    const round1ActionsCount =
                        await this.round1ActionModel.count({
                            'actionData.committeeId': key.committeeId,
                            'actionData.keyId': key.keyId,
                            active: true,
                        });
                    if (
                        key.status == KeyStatusEnum.ROUND_2_CONTRIBUTION ||
                        key.status == KeyStatusEnum.ACTIVE
                    ) {
                        this._dkg.keyStorage.updateRawLeaf(
                            { level1Index },
                            PublicKey.fromBase58(key.key).toGroup(),
                        );
                    }
                    if (round1ActionsCount == committee.numberOfMembers) {
                        this._round1.contributionStorage.updateInternal(
                            Field(key.keyIndex),
                            DKG_LEVEL_2_TREE(),
                        );
                        this._round1.publicKeyStorage.updateInternal(
                            Field(key.keyIndex),
                            DKG_LEVEL_2_TREE(),
                        );
                        const round1s = key.round1s.sort(
                            (a, b) => a.memberId - b.memberId,
                        );
                        for (let k = 0; k < round1s.length; k++) {
                            const round1 = round1s[k];
                            const contribution: Group[] =
                                round1.contribution.map((point) =>
                                    Group.from(point.x, point.y),
                                );

                            const level2Index =
                                this._round1.contributionStorage.calculateLevel2Index(
                                    Field(round1.memberId),
                                );
                            this._round1.contributionStorage.updateRawLeaf(
                                { level1Index, level2Index },
                                new Round1Contribution({
                                    C: Libs.Committee.CArray.from(contribution),
                                }),
                            );
                            this._round1.publicKeyStorage.updateRawLeaf(
                                {
                                    level1Index,
                                    level2Index,
                                },
                                contribution[0],
                            );
                        }
                    }
                    const round2ActionsCount =
                        await this.round2ActionModel.count({
                            'actionData.committeeId': key.committeeId,
                            'actionData.keyId': key.keyId,
                            active: true,
                        });
                    if (round2ActionsCount == committee.numberOfMembers) {
                        const round2s = key.round2s.sort(
                            (a, b) => a.memberId - b.memberId,
                        );
                        const contributions: Libs.Committee.Round2Contribution[] =
                            [];
                        for (let k = 0; k < round2s.length; k++) {
                            const round2 = round2s[k];
                            const c: Bit255[] = round2.contribution.c.map(
                                (value) => Bit255.fromBigInt(BigInt(value)),
                            );
                            const u: Group[] = round2.contribution.u.map(
                                (point) => Group.from(point.x, point.y),
                            );
                            contributions.push(
                                new Libs.Committee.Round2Contribution({
                                    c: Libs.Committee.cArray.from(c),
                                    U: Libs.Committee.UArray.from(u),
                                }),
                            );
                        }

                        for (let k = 0; k < round2s.length; k++) {
                            const round2 = round2s[k];
                            const level2Index =
                                this._round2.contributionStorage.calculateLevel2Index(
                                    Field(round2.memberId),
                                );
                            this._round2.contributionStorage.updateRawLeaf(
                                { level1Index, level2Index },
                                contributions[k],
                            );
                            this._round2.encryptionStorage.updateRawLeaf(
                                { level1Index, level2Index },
                                {
                                    memberId: Field(round2.memberId),
                                    contributions: contributions,
                                },
                            );
                        }
                    }
                }
            }
            await this.updateProcessStorageForDkg();
            await this.updateProcessStorageForRound1();
            await this.updateProcessStorageForRound2();
        } catch (err) {
            console.log(err);
        }
    }

    private async updateProcessStorageForDkg() {
        const dkgEvents = await this.dkgEventModel.find(
            {},
            {},
            { sort: { eventId: 1 } },
        );
        for (let i = 0; i < dkgEvents.length; i++) {
            const dkgEvent = dkgEvents[i];
            for (let j = 0; j < dkgEvent.data.length; j++) {
                const actionState = dkgEvent.data[j];
                if (!this._dkg.processStorageMapping[actionState]) {
                    this._dkg.processStorageMapping[actionState] = 0;
                } else {
                    this._dkg.processStorageMapping[actionState] += 1;
                }
            }
        }
        const dkgActions = await this.dkgActionModel.find(
            { active: true },
            {},
            { sort: { actionId: 1 } },
        );
        for (let i = 0; i < dkgActions.length; i++) {
            const dkgAction = dkgActions[i];
            if (
                this._dkg.processStorageMapping[dkgAction.currentActionState] !=
                undefined
            ) {
                this._dkg.processStorage.updateLeaf(
                    { level1Index: Field(dkgAction.actionId) },
                    this._dkg.processStorage.calculateLeaf({
                        actionState: Field(dkgAction.currentActionState),
                        processCounter: new UInt8(
                            this._dkg.processStorageMapping[
                                dkgAction.currentActionState
                            ],
                        ),
                    }),
                );
            }
        }
    }

    private async updateProcessStorageForRound1() {
        const round1Events = await this.round1EventModel.find(
            {},
            {},
            { sort: { eventId: 1 } },
        );
        for (let i = 0; i < round1Events.length; i++) {
            const round1Event = round1Events[i];
            for (let j = 0; j < round1Event.data.length; j++) {
                const actionState = round1Event.data[j];
                if (!this._round1.processStorageMapping[actionState]) {
                    this._round1.processStorageMapping[actionState] = 0;
                } else {
                    this._round1.processStorageMapping[actionState] += 1;
                }
            }
        }

        const round1Actions = await this.round1ActionModel.find(
            { active: true },
            {},
            { sort: { actionId: 1 } },
        );
        for (let i = 0; i < round1Actions.length; i++) {
            const round1Action = round1Actions[i];
            if (
                this._round1.processStorageMapping[
                    round1Action.currentActionState
                ] != undefined
            ) {
                this._round1.processStorage.updateAction(
                    Field(round1Action.actionId),
                    {
                        actionState: Field(round1Action.currentActionState),
                        processCounter: new UInt8(
                            this._round1.processStorageMapping[
                                round1Action.currentActionState
                            ],
                        ),
                    },
                );
            }
        }
    }

    private async updateProcessStorageForRound2() {
        const round2Events = await this.round2EventModel.find(
            {},
            {},
            { sort: { eventId: 1 } },
        );
        for (let i = 0; i < round2Events.length; i++) {
            const round2Event = round2Events[i];
            for (let j = 0; j < round2Event.data.length; j++) {
                const actionState = round2Event.data[j];
                if (!this._round2.processStorageMapping[actionState]) {
                    this._round2.processStorageMapping[actionState] = 0;
                } else {
                    this._round2.processStorageMapping[actionState] += 1;
                }
            }
        }

        const round2Actions = await this.round2ActionModel.find(
            { active: true },
            {},
            { sort: { actionId: 1 } },
        );
        for (let i = 0; i < round2Actions.length; i++) {
            const round2Action = round2Actions[i];
            if (
                this._round2.processStorageMapping[
                    round2Action.currentActionState
                ] != undefined
            ) {
                this._round2.processStorage.updateAction(
                    Field(round2Action.actionId),
                    {
                        actionState: Field(round2Action.currentActionState),
                        processCounter: new UInt8(
                            this._round2.processStorageMapping[
                                round2Action.currentActionState
                            ],
                        ),
                    },
                );
            }
        }
    }
}
