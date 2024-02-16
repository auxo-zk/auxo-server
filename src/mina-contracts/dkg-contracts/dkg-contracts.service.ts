import { Injectable, Logger } from '@nestjs/common';
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
import { Model } from 'mongoose';
import { DkgAction, getDkg } from 'src/schemas/actions/dkg-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
    Round1Action,
    getRound1,
} from 'src/schemas/actions/round-1-action.schema';
import {
    Round2Action,
    getRound2,
} from 'src/schemas/actions/round-2-action.schema';
import { Dkg } from 'src/schemas/dkg.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';
import { Key } from 'src/schemas/key.schema';
import {
    calculatePublicKey,
    Constants,
    Libs,
    Round1Contribution,
    Storage,
    ZkApp,
    DKGContract,
    Round1Contract,
    Round2Contract,
    UpdateKey,
    ReduceRound1,
    FinalizeRound1,
    ReduceRound2,
    BatchEncryption,
    FinalizeRound2,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Bit255 } from '@auxo-dev/auxo-libs';
import { Committee } from 'src/schemas/committee.schema';
import {
    ActionReduceStatusEnum,
    DkgActionEnum,
    KeyStatusEnum,
    MaxRetries,
    ZkAppEnum,
    zkAppCache,
} from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import {
    DkgState,
    Round1State,
    Round2State,
} from 'src/interfaces/zkapp-state.interface';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';

@Injectable()
export class DkgContractsService implements ContractServiceInterface {
    private readonly logger = new Logger(DkgContractsService.name);
    private readonly _dkg: {
        zkApp: Storage.SharedStorage.AddressStorage;
        keyCounter: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
    };
    private readonly _round1: {
        zkApp: Storage.SharedStorage.AddressStorage;
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
        reducedActions: Field[];
    };
    private readonly _round2: {
        zkApp: Storage.SharedStorage.AddressStorage;
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
        reducedActions: Field[];
    };

    public get dkg(): {
        zkApp: Storage.SharedStorage.AddressStorage;
        keyCounter: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
    } {
        return this._dkg;
    }

    public get round1(): {
        zkApp: Storage.SharedStorage.AddressStorage;
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
        reducedActions: Field[];
    } {
        return this._round1;
    }

    public get round2(): {
        zkApp: Storage.SharedStorage.AddressStorage;
        reduceState: Storage.SharedStorage.ReduceStorage;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
        reducedActions: Field[];
    } {
        return this._round2;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly committeeContractService: CommitteeContractService,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(Dkg.name)
        private readonly dkgModel: Model<Dkg>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._dkg = {
            zkApp: new Storage.SharedStorage.AddressStorage([
                {
                    index: Constants.ZkAppEnum.COMMITTEE,
                    address: PublicKey.fromBase58(
                        process.env.COMMITTEE_ADDRESS,
                    ),
                },
            ]),
            keyCounter: new Storage.CommitteeStorage.KeyCounterStorage(),
            keyStatus: new Storage.DKGStorage.KeyStatusStorage(),
        };
        this._round1 = {
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
            ]),
            reduceState: new Storage.SharedStorage.ReduceStorage(),
            contribution: new Storage.DKGStorage.Round1ContributionStorage(),
            publicKey: new Storage.DKGStorage.PublicKeyStorage(),
            reducedActions: [],
        };
        this._round2 = {
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
            ]),
            reduceState: new Storage.SharedStorage.ReduceStorage(),
            contribution: new Storage.DKGStorage.Round2ContributionStorage(),
            encryption: new Storage.DKGStorage.EncryptionStorage(),
            reducedActions: [],
        };
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            // console.log(await this.getKeysReadyForRound1Finalization());
            // console.log(await this.getKeysReadyForRound2Finalization());
            // await this.committeeContractService.compile();
            // await this.compile();
            // await this.reduceRound1();
            // await this.rollupDkg();
            // await this.finalizeRound1(3, 0);
            // await this.reduceRound2();
            // await this.finalizeRound2(4, 0);
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
                await this.updateDkgs();
                await this.updateRound1s();
                await this.updateRound2s();
                await this.updateKeys();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(UpdateKey, cache, this.logger);
        await Utilities.compile(DKGContract, cache, this.logger);
        await Utilities.compile(ReduceRound1, cache, this.logger);
        await Utilities.compile(FinalizeRound1, cache, this.logger);
        await Utilities.compile(Round1Contract, cache, this.logger);
        await Utilities.compile(ReduceRound2, cache, this.logger);
        await Utilities.compile(BatchEncryption, cache, this.logger);
        await Utilities.compile(FinalizeRound2, cache, this.logger);
        await Utilities.compile(Round2Contract, cache, this.logger);
    }

    async rollupDkg(): Promise<boolean> {
        try {
            const lastActiveDkg = await this.dkgModel.findOne(
                { active: true },
                {},
                { sort: { actionId: -1 } },
            );
            const lastReducedAction = lastActiveDkg
                ? await this.dkgActionModel.findOne({
                      actionId: lastActiveDkg.actionId,
                  })
                : undefined;
            const notReducedActions = await this.dkgActionModel.find(
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
            if (notReducedActions.length > 0) {
                const state = await this.fetchDkgState();
                let proof = await UpdateKey.firstStep(
                    lastReducedAction
                        ? ZkApp.DKG.Action.fromFields(
                              Utilities.stringArrayToFields(
                                  lastReducedAction.actions,
                              ),
                          )
                        : ZkApp.DKG.Action.empty(),
                    state.keyCounter,
                    state.keyStatus,
                    lastReducedAction
                        ? Field(lastReducedAction.currentActionState)
                        : Reducer.initialActionState,
                );
                const notActiveDkgs = await this.dkgModel.find(
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
                const rawKeyMapping = await this.keyModel.aggregate([
                    {
                        $group: {
                            _id: '$committeeId',
                            items: { $push: '$$ROOT' },
                        },
                    },
                ]);
                const keyMapping: {
                    [key: string]: {
                        [key: string]: {
                            committeeId: number;
                            keyId: number;
                            status: KeyStatusEnum;
                        };
                    };
                } = {};
                for (let i = 0; i < rawKeyMapping.length; i++) {
                    const committeeId: number = rawKeyMapping[i]._id;
                    const keys = rawKeyMapping[i].items;
                    keyMapping[committeeId] = {};
                    for (let j = 0; j < keys.length; j++) {
                        keyMapping[committeeId][keys[j]['keyId']] = keys[j];
                    }
                }
                const keyCounter = this._dkg.keyCounter;
                const keyStatus = this._dkg.keyStatus;
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    const notActiveDkg = notActiveDkgs[i];
                    const committeeId = notActiveDkg.committeeId;
                    let key: {
                        committeeId: number;
                        keyId: number;
                        status: KeyStatusEnum;
                    };
                    if (!keyMapping[committeeId]) {
                        keyMapping[committeeId] = {};
                    }
                    if (notActiveDkg.keyId != undefined) {
                        key = keyMapping[committeeId][notActiveDkg.keyId];
                        switch (notActiveDkg.actionEnum) {
                            case DkgActionEnum.FINALIZE_ROUND_2:
                                key.status = KeyStatusEnum.ACTIVE;
                                break;
                            case DkgActionEnum.FINALIZE_ROUND_1:
                                key.status = KeyStatusEnum.ROUND_2_CONTRIBUTION;
                                break;
                            case DkgActionEnum.DEPRECATE_KEY:
                                key.status = KeyStatusEnum.DEPRECATED;
                                break;
                        }
                        proof = await UpdateKey.nextStep(
                            ZkApp.DKG.Action.fromFields(
                                Utilities.stringArrayToFields(
                                    notReducedAction.actions,
                                ),
                            ),
                            proof,
                            keyStatus.getWitness(
                                Storage.DKGStorage.KeyStatusStorage.calculateLevel1Index(
                                    {
                                        committeeId: Field(committeeId),
                                        keyId: Field(key.keyId),
                                    },
                                ),
                            ),
                        );
                        keyMapping[committeeId][key.keyId] = key;
                        keyStatus.updateLeaf(
                            {
                                level1Index:
                                    Storage.DKGStorage.KeyStatusStorage.calculateLevel1Index(
                                        {
                                            committeeId: Field(committeeId),
                                            keyId: Field(key.keyId),
                                        },
                                    ),
                            },
                            Field(key.status),
                        );
                    } else {
                        key = {
                            committeeId: committeeId,
                            keyId: Object.keys(keyMapping[committeeId]).length,
                            status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
                        };

                        proof = await UpdateKey.nextStepGeneration(
                            ZkApp.DKG.Action.fromFields(
                                Utilities.stringArrayToFields(
                                    notReducedAction.actions,
                                ),
                            ),
                            proof,
                            Field(key.keyId),
                            keyCounter.getWitness(
                                Storage.CommitteeStorage.KeyCounterStorage.calculateLevel1Index(
                                    Field(committeeId),
                                ),
                            ),
                            keyStatus.getWitness(
                                Storage.DKGStorage.KeyStatusStorage.calculateLevel1Index(
                                    {
                                        committeeId: Field(committeeId),
                                        keyId: Field(key.keyId),
                                    },
                                ),
                            ),
                        );
                        keyMapping[committeeId][key.keyId] = key;
                        keyCounter.updateLeaf(
                            {
                                level1Index:
                                    Storage.CommitteeStorage.KeyCounterStorage.calculateLevel1Index(
                                        Field(committeeId),
                                    ),
                            },
                            Field(Object.keys(keyMapping[committeeId]).length),
                        );
                        keyStatus.updateLeaf(
                            {
                                level1Index:
                                    Storage.DKGStorage.KeyStatusStorage.calculateLevel1Index(
                                        {
                                            committeeId: Field(committeeId),
                                            keyId: Field(key.keyId),
                                        },
                                    ),
                            },
                            Field(key.status),
                        );
                    }
                }
                const dkgContract = new DKGContract(
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
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
                    () => {
                        dkgContract.updateKeys(proof);
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
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    async reduceRound1(): Promise<boolean> {
        try {
            const lastActiveRound1 = await this.round1Model.findOne(
                { active: true },
                {},
                { sort: { actionId: -1 } },
            );

            const lastReducedAction = lastActiveRound1
                ? await this.round1ActionModel.findOne({
                      actionId: lastActiveRound1.actionId,
                  })
                : undefined;
            const notReducedActions = await this.round1ActionModel.find(
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
            if (notReducedActions.length > 0) {
                const state = await this.fetchRound1State();
                let proof = await ReduceRound1.firstStep(
                    lastReducedAction
                        ? ZkApp.Round1.Action.fromFields(
                              Utilities.stringArrayToFields(
                                  lastReducedAction.actions,
                              ),
                          )
                        : ZkApp.Round1.Action.empty(),
                    state.reduceState,
                    lastReducedAction
                        ? Field(lastReducedAction.currentActionState)
                        : Reducer.initialActionState,
                );
                const reduceState = this._round1.reduceState;
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    proof = await ReduceRound1.nextStep(
                        ZkApp.Round1.Action.fromFields(
                            Utilities.stringArrayToFields(
                                notReducedAction.actions,
                            ),
                        ),
                        proof,
                        this._round1.reduceState.getWitness(
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
                const round1Contract = new Round1Contract(
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
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
                    () => {
                        round1Contract.reduce(proof);
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
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    async reduceRound2(): Promise<boolean> {
        try {
            const lastActiveRound2 = await this.round2Model.findOne(
                { active: true },
                {},
                { sort: { actionId: -1 } },
            );
            const lastReducedAction = lastActiveRound2
                ? await this.round2ActionModel.findOne({
                      actionId: lastActiveRound2.actionId,
                  })
                : undefined;
            const notReducedActions = await this.round2ActionModel.find({
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : -1,
                },
            });
            if (notReducedActions.length > 0) {
                const state = await this.fetchRound2State();
                let proof = await ReduceRound2.firstStep(
                    lastReducedAction
                        ? ZkApp.Round2.Action.fromFields(
                              Utilities.stringArrayToFields(
                                  lastReducedAction.actions,
                              ),
                          )
                        : ZkApp.Round2.Action.empty(),
                    state.reduceState,
                    lastReducedAction
                        ? Field(lastReducedAction.currentActionState)
                        : Reducer.initialActionState,
                );
                const reduceState = this._round2.reduceState;
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    proof = await ReduceRound2.nextStep(
                        ZkApp.Round2.Action.fromFields(
                            Utilities.stringArrayToFields(
                                notReducedAction.actions,
                            ),
                        ),
                        proof,
                        this._round2.reduceState.getWitness(
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
                    () => {
                        round2Contract.reduce(proof);
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
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    async getKeysReadyForRound1Finalization(): Promise<Key[]> {
        const keys = await this.keyModel.find({
            status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
        });
        const result: Key[] = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const committee = await this.committeeModel.findOne({
                committeeId: key.committeeId,
            });
            const round1s = await this.round1Model.find({
                committeeId: key.committeeId,
                keyId: key.keyId,
                active: true,
            });
            if (round1s.length == committee.numberOfMembers) {
                if (
                    !(await this.dkgModel.exists({
                        committeeId: key.committeeId,
                        keyId: key.keyId,
                        actionEnum: DkgActionEnum.FINALIZE_ROUND_1,
                    }))
                ) {
                    result.push(key);
                }
            }
        }
        return result;
    }

    async finalizeRound1(committeeId: number, keyId: number): Promise<boolean> {
        try {
            const key = await this.keyModel.findById(
                Utilities.getKeyObjectId(committeeId, keyId),
            );
            if (key && key.status == KeyStatusEnum.ROUND_1_CONTRIBUTION) {
                const committee = await this.committeeModel.findOne({
                    committeeId: committeeId,
                });
                const round1s = await this.round1Model.find(
                    {
                        committeeId: committeeId,
                        keyId: keyId,
                        active: true,
                    },
                    {},
                    { sort: { memberId: 1 } },
                );
                if (round1s.length == committee.numberOfMembers) {
                    const round1State = await this.fetchRound1State();
                    let proof = await FinalizeRound1.firstStep(
                        new ZkApp.Round1.Round1Input({
                            previousActionState: Field(0),
                            action: ZkApp.Round1.Action.empty(),
                        }),
                        Field(committee.threshold),
                        Field(committee.numberOfMembers),
                        round1State.contribution,
                        round1State.publicKey,
                        round1State.reduceState,
                        this._round1.contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        }),
                        this._round1.contribution.getLevel1Witness(
                            this._round1.contribution.calculateLevel1Index({
                                committeeId: Field(committeeId),
                                keyId: Field(keyId),
                            }),
                        ),
                        this._round1.publicKey.getLevel1Witness(
                            this._round1.contribution.calculateLevel1Index({
                                committeeId: Field(committeeId),
                                keyId: Field(keyId),
                            }),
                        ),
                    );

                    const contribution = this._round1.contribution;
                    const publicKey = this._round1.publicKey;
                    contribution.updateInternal(
                        contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        }),
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    publicKey.updateInternal(
                        publicKey.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        }),
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    for (let i = 0; i < round1s.length; i++) {
                        const round1 = round1s[i];
                        const round1Action =
                            await this.round1ActionModel.findOne({
                                actionId: round1.actionId,
                            });
                        proof = await FinalizeRound1.nextStep(
                            new ZkApp.Round1.Round1Input({
                                previousActionState: Field(
                                    round1Action.previousActionState,
                                ),
                                action: ZkApp.Round1.Action.fromFields(
                                    Utilities.stringArrayToFields(
                                        round1Action.actions,
                                    ),
                                ),
                            }),
                            proof,
                            contribution.getWitness(
                                contribution.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                contribution.calculateLevel2Index(
                                    Field(round1.memberId),
                                ),
                            ),
                            publicKey.getWitness(
                                publicKey.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                publicKey.calculateLevel2Index(
                                    Field(round1.memberId),
                                ),
                            ),
                            this._round1.reduceState.getWitness(
                                Field(round1Action.currentActionState),
                            ),
                        );
                        contribution.updateLeaf(
                            {
                                level1Index: contribution.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                level2Index: contribution.calculateLevel2Index(
                                    Field(round1.memberId),
                                ),
                            },
                            contribution.calculateLeaf(
                                ZkApp.Round1.Action.fromFields(
                                    Utilities.stringArrayToFields(
                                        round1Action.actions,
                                    ),
                                ).contribution,
                            ),
                        );
                        publicKey.updateLeaf(
                            {
                                level1Index: publicKey.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                level2Index: publicKey.calculateLevel2Index(
                                    Field(round1.memberId),
                                ),
                            },
                            publicKey.calculateLeaf(
                                ZkApp.Round1.Action.fromFields(
                                    Utilities.stringArrayToFields(
                                        round1Action.actions,
                                    ),
                                ).contribution.C.get(Field(0)),
                            ),
                        );
                    }
                    const round1Contract = new Round1Contract(
                        PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                    );
                    const feePayerPrivateKey = PrivateKey.fromBase58(
                        process.env.FEE_PAYER_PRIVATE_KEY,
                    );
                    await this.committeeContractService.fetchCommitteeState();
                    await this.fetchDkgState();
                    const tx = await Mina.transaction(
                        {
                            sender: feePayerPrivateKey.toPublicKey(),
                            fee: process.env.FEE,
                        },
                        () => {
                            round1Contract.finalize(
                                proof,
                                new Storage.SharedStorage.ZkAppRef({
                                    address: PublicKey.fromBase58(
                                        process.env.COMMITTEE_ADDRESS,
                                    ),
                                    witness: this._round1.zkApp.getWitness(
                                        Field(ZkAppEnum.COMMITTEE),
                                    ),
                                }),
                                new Storage.SharedStorage.ZkAppRef({
                                    address: PublicKey.fromBase58(
                                        process.env.DKG_ADDRESS,
                                    ),
                                    witness: this._round1.zkApp.getWitness(
                                        Field(ZkAppEnum.DKG),
                                    ),
                                }),
                                this.committeeContractService.settingTree.getWitness(
                                    Field(committeeId),
                                ),
                                this._dkg.keyStatus.getWitness(
                                    this._dkg.keyStatus.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(keyId),
                                    }),
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
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    async getKeysReadyForRound2Finalization(): Promise<Key[]> {
        const keys = await this.keyModel.find({
            status: KeyStatusEnum.ROUND_2_CONTRIBUTION,
        });
        const result: Key[] = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const committee = await this.committeeModel.findOne({
                committeeId: key.committeeId,
            });
            const round2s = await this.round2Model.find({
                committeeId: key.committeeId,
                keyId: key.keyId,
                active: true,
            });
            if (round2s.length == committee.numberOfMembers) {
                if (
                    !(await this.dkgModel.find({
                        committeeId: key.committeeId,
                        keyId: key.keyId,
                        actionEnum: DkgActionEnum.FINALIZE_ROUND_2,
                    }))
                ) {
                    result.push(key);
                }
            }
        }
        return result;
    }

    async finalizeRound2(committeeId: number, keyId: number): Promise<boolean> {
        try {
            const key = await this.keyModel.findById(
                Utilities.getKeyObjectId(committeeId, keyId),
            );
            if (key && key.status == KeyStatusEnum.ROUND_2_CONTRIBUTION) {
                const committee = await this.committeeModel.findOne({
                    committeeId: committeeId,
                });
                const round2s = await this.round2Model.find(
                    {
                        committeeId: committeeId,
                        keyId: keyId,
                        active: true,
                    },
                    {},
                    {
                        sort: {
                            memberId: 1,
                        },
                    },
                );
                if (round2s.length == committee.numberOfMembers) {
                    const round2State = await this.fetchRound2State();
                    const initialHashArray =
                        new Libs.Committee.EncryptionHashArray(
                            [...Array(committee.numberOfMembers).keys()].map(
                                () => Field(0),
                            ),
                        );
                    let proof = await FinalizeRound2.firstStep(
                        new ZkApp.Round2.Round2Input({
                            previousActionState: Field(0),
                            action: ZkApp.Round2.Action.empty(),
                        }),
                        Field(committee.threshold),
                        Field(committee.numberOfMembers),
                        round2State.contribution,
                        round2State.reduceState,
                        this._round2.contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        }),
                        initialHashArray,
                        this._round2.contribution.getLevel1Witness(
                            this._round2.contribution.calculateLevel1Index({
                                committeeId: Field(committeeId),
                                keyId: Field(keyId),
                            }),
                        ),
                    );

                    const contribution = this._round2.contribution;
                    const encryption = this._round2.encryption;
                    contribution.updateInternal(
                        contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        }),
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    const contributions = [];
                    for (let i = 0; i < round2s.length; i++) {
                        const round2 = round2s[i];
                        const round2Action =
                            await this.round2ActionModel.findOne({
                                actionId: round2.actionId,
                            });
                        contributions.push(
                            ZkApp.Round2.Action.fromFields(
                                Utilities.stringArrayToFields(
                                    round2Action.actions,
                                ),
                            ).contribution,
                        );
                    }

                    for (let i = 0; i < round2s.length; i++) {
                        const round2 = round2s[i];
                        const round2Action =
                            await this.round2ActionModel.findOne({
                                actionId: round2.actionId,
                            });
                        proof = await FinalizeRound2.nextStep(
                            new ZkApp.Round2.Round2Input({
                                previousActionState: Field(
                                    round2Action.previousActionState,
                                ),
                                action: ZkApp.Round2.Action.fromFields(
                                    Utilities.stringArrayToFields(
                                        round2Action.actions,
                                    ),
                                ),
                            }),
                            proof,
                            contribution.getWitness(
                                contribution.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                contribution.calculateLevel2Index(
                                    Field(round2.memberId),
                                ),
                            ),
                            this._round2.reduceState.getWitness(
                                Field(round2Action.currentActionState),
                            ),
                        );
                        contribution.updateLeaf(
                            {
                                level1Index: contribution.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                level2Index: contribution.calculateLevel2Index(
                                    Field(round2.memberId),
                                ),
                            },
                            contribution.calculateLeaf(
                                ZkApp.Round2.Action.fromFields(
                                    Utilities.stringArrayToFields(
                                        round2Action.actions,
                                    ),
                                ).contribution,
                            ),
                        );
                        encryption.updateLeaf(
                            {
                                level1Index: contribution.calculateLevel1Index({
                                    committeeId: Field(committeeId),
                                    keyId: Field(keyId),
                                }),
                                level2Index: contribution.calculateLevel2Index(
                                    Field(round2.memberId),
                                ),
                            },
                            encryption.calculateLeaf({
                                contributions: contributions,
                                memberId: Field(round2.memberId),
                            }),
                        );
                    }
                    const round2Contract = new Round2Contract(
                        PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                    );
                    const feePayerPrivateKey = PrivateKey.fromBase58(
                        process.env.FEE_PAYER_PRIVATE_KEY,
                    );
                    await this.committeeContractService.fetchCommitteeState();
                    await this.fetchDkgState();
                    const tx = await Mina.transaction(
                        {
                            sender: feePayerPrivateKey.toPublicKey(),
                            fee: process.env.FEE,
                        },
                        () => {
                            round2Contract.finalize(
                                proof,
                                encryption.getLevel1Witness(
                                    encryption.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(keyId),
                                    }),
                                ),
                                new Storage.SharedStorage.ZkAppRef({
                                    address: PublicKey.fromBase58(
                                        process.env.COMMITTEE_ADDRESS,
                                    ),
                                    witness: this._round2.zkApp.getWitness(
                                        Field(ZkAppEnum.COMMITTEE),
                                    ),
                                }),
                                new Storage.SharedStorage.ZkAppRef({
                                    address: PublicKey.fromBase58(
                                        process.env.DKG_ADDRESS,
                                    ),
                                    witness: this._round2.zkApp.getWitness(
                                        Field(ZkAppEnum.DKG),
                                    ),
                                }),
                                this.committeeContractService.settingTree.getLevel1Witness(
                                    Field(committeeId),
                                ),
                                this._dkg.keyStatus.getLevel1Witness(
                                    this._dkg.keyStatus.calculateLevel1Index({
                                        committeeId: Field(committeeId),
                                        keyId: Field(keyId),
                                    }),
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
            return false;
        } catch (err) {
            this.logger.error(err);
        } finally {
            return false;
        }
    }

    async fetchDkgState(): Promise<DkgState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.DKG_ADDRESS,
        );
        const dkgState: DkgState = {
            zkApp: Field(state[0]),
            keyCounter: Field(state[1]),
            keyStatus: Field(state[2]),
        };
        return dkgState;
    }

    async fetchRound1State(): Promise<Round1State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_1_ADDRESS,
        );
        const round1State: Round1State = {
            zkApp: Field(state[0]),
            reduceState: Field(state[1]),
            contribution: Field(state[2]),
            publicKey: Field(state[3]),
        };
        return round1State;
    }

    async fetchRound2State(): Promise<Round2State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_2_ADDRESS,
        );
        const round2State: Round2State = {
            zkApp: Field(state[0]),
            reduceState: Field(state[1]),
            contribution: Field(state[2]),
            encryption: Field(state[3]),
        };
        return round2State;
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchDkgActions() {
        const lastAction = await this.dkgActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.DKG_ADDRESS,
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
            await this.dkgActionModel.findOneAndUpdate(
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

    private async fetchRound1Actions() {
        const lastAction = await this.round1ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_1_ADDRESS,
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
            await this.round1ActionModel.findOneAndUpdate(
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

    private async fetchRound2Actions() {
        const lastAction = await this.round2ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_2_ADDRESS,
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
            await this.round2ActionModel.findOneAndUpdate(
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

    private async updateDkgs() {
        let promises = [];
        const lastDkg = await this.dkgModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let dkgActions: DkgAction[];
        if (lastDkg != null) {
            dkgActions = await this.dkgActionModel.find(
                { actionId: { $gt: lastDkg.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            dkgActions = await this.dkgActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }

        for (let i = 0; i < dkgActions.length; i++) {
            const dkgAction = dkgActions[i];
            promises.push(
                this.dkgModel.findOneAndUpdate(
                    { actionId: dkgAction.actionId },
                    getDkg(dkgAction),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.DKG_ADDRESS,
        );
        if (rawEvents.length > 0) {
            // const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveDkgAction = await this.dkgActionModel.findOne({
                currentActionState: lastActionState,
            });
            const notActiveDkgs = await this.dkgModel.find(
                {
                    actionId: { $lte: lastActiveDkgAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveDkgs.length; i++) {
                const notActiveDkg = notActiveDkgs[i];
                notActiveDkg.set('active', true);
                promises.push(notActiveDkg.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateRound1s() {
        let promises = [];
        const lastRound1Contribution = await this.round1Model.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let round1Actions: Round1Action[];
        if (lastRound1Contribution != null) {
            round1Actions = await this.round1ActionModel.find(
                { actionId: { $gt: lastRound1Contribution.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            round1Actions = await this.round1ActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < round1Actions.length; i++) {
            const round1Action = round1Actions[i];
            promises.push(
                this.round1Model.findOneAndUpdate(
                    { actionId: round1Action.actionId },
                    getRound1(round1Action),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.ROUND_1_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveRound1Action = await this.round1ActionModel.findOne(
                {
                    currentActionState: lastActionState,
                },
            );
            const notActiveRound1Contributions = await this.round1Model.find(
                {
                    actionId: { $lte: lastActiveRound1Action.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveRound1Contributions.length; i++) {
                const notActiveRound1Contribution =
                    notActiveRound1Contributions[i];
                notActiveRound1Contribution.set('active', true);
                promises.push(notActiveRound1Contribution.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateRound2s() {
        let promises = [];
        const lastRound2Contribution = await this.round2Model.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let round2Actions: Round2Action[];
        if (lastRound2Contribution != null) {
            round2Actions = await this.round2ActionModel.find(
                { actionId: { $gt: lastRound2Contribution.actionId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            round2Actions = await this.round2ActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }
        for (let i = 0; i < round2Actions.length; i++) {
            const round2Action = round2Actions[i];
            promises.push(
                this.round2Model.findOneAndUpdate(
                    { actionId: round2Action.actionId },
                    getRound2(round2Action),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.ROUND_2_ADDRESS,
        );
        if (rawEvents.length > 0) {
            // const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActionState = Field(lastEvent[0].data[0]).toString();
            const lastActiveRound2Action = await this.round2ActionModel.findOne(
                {
                    currentActionState: lastActionState,
                },
            );
            const notActiveRound2Contributions = await this.round2Model.find(
                {
                    actionId: { $lte: lastActiveRound2Action.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveRound2Contributions.length; i++) {
                const notActiveRound2Contribution =
                    notActiveRound2Contributions[i];
                notActiveRound2Contribution.set('active', true);
                promises.push(notActiveRound2Contribution.save());
            }
            await Promise.all(promises);
        }
    }

    private async updateKeys() {
        const keyCounters: { _id: number; count: number }[] =
            await this.dkgModel.aggregate([
                {
                    $match: {
                        active: true,
                        actionEnum: DkgActionEnum.GENERATE_KEY,
                    },
                },
                {
                    $group: {
                        _id: '$committeeId',
                        count: { $count: {} },
                    },
                },
            ]);
        for (let i = 0; i < keyCounters.length; i++) {
            const keyCounter = keyCounters[i];
            const committeeId = keyCounter._id;
            await this.dkgModel.find(
                { active: true },
                {},
                { sort: { actionId: 1 } },
            );
            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const keyObjectId = Utilities.getKeyObjectId(
                    committeeId,
                    keyId,
                );
                const existed = await this.keyModel.exists({
                    _id: keyObjectId,
                });
                if (!existed) {
                    await this.keyModel.create({
                        _id: keyObjectId,
                        committeeId: committeeId,
                        keyId: keyId,
                        status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
                    });
                }
                const deprecated = await this.dkgModel.exists({
                    committeeId: committeeId,
                    keyId: keyId,
                    actionEnum: DkgActionEnum.DEPRECATE_KEY,
                    active: true,
                });
                const key = await this.keyModel.findOne({
                    _id: keyObjectId,
                });
                if (deprecated) {
                    key.set('status', KeyStatusEnum.DEPRECATED);
                } else {
                    const finalizedRound2 = await this.dkgModel.exists({
                        committeeId: committeeId,
                        keyId: keyId,
                        actionEnum: DkgActionEnum.FINALIZE_ROUND_2,
                        active: true,
                    });
                    if (finalizedRound2) {
                        key.set('status', KeyStatusEnum.ACTIVE);
                    } else {
                        const finalizedRound1 = await this.dkgModel.exists({
                            committeeId: committeeId,
                            keyId: keyId,
                            actionEnum: DkgActionEnum.FINALIZE_ROUND_1,
                            active: true,
                        });
                        if (finalizedRound1) {
                            key.set(
                                'status',
                                KeyStatusEnum.ROUND_2_CONTRIBUTION,
                            );
                        }
                    }
                    if (
                        key.status >= KeyStatusEnum.ROUND_2_CONTRIBUTION &&
                        !key.publicKey
                    ) {
                        const round1s = await this.round1Model.find({
                            committeeId: committeeId,
                            keyId: keyId,
                            active: true,
                        });

                        const round1Contributions = round1s.map(
                            (e) =>
                                new Round1Contribution({
                                    C: new Libs.Committee.CArray(
                                        e.contribution.map((g) =>
                                            Group.from(g.x, g.y),
                                        ),
                                    ),
                                }),
                        );

                        const publicKey = PublicKey.fromGroup(
                            calculatePublicKey(round1Contributions),
                        );
                        key.set('publicKey', publicKey.toBase58());
                    }
                }
                await key.save();
            }
        }
    }

    async updateMerkleTrees() {
        try {
            await this.updateMerkleTreesForDkg();
            await this.updateMerkleTreesForRound1();
            await this.updateMerkleTreesForRound2();
        } catch (err) {}
    }

    private async updateMerkleTreesForDkg() {
        const keyCounters: { _id: number; count: number }[] =
            await this.dkgModel.aggregate([
                {
                    $match: {
                        active: true,
                        actionEnum: DkgActionEnum.GENERATE_KEY,
                    },
                },
                {
                    $group: {
                        _id: '$committeeId',
                        count: { $count: {} },
                    },
                },
            ]);
        for (let i = 0; i < keyCounters.length; i++) {
            const keyCounter = keyCounters[i];
            const committeeId = keyCounter._id;

            this._dkg.keyCounter.updateLeaf(
                {
                    level1Index: this._dkg.keyCounter.calculateLevel1Index(
                        Field(committeeId),
                    ),
                },
                this._dkg.keyCounter.calculateLeaf(Field(keyCounter.count)),
            );

            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const keyObjectId = Utilities.getKeyObjectId(
                    committeeId,
                    keyId,
                );
                const key = await this.keyModel.findOne({ _id: keyObjectId });
                const level1Index = this._dkg.keyStatus.calculateLevel1Index({
                    committeeId: Field(committeeId),
                    keyId: Field(keyId),
                });
                const leaf = this._dkg.keyStatus.calculateLeaf(
                    key.status as any,
                );
                this._dkg.keyStatus.updateLeaf(
                    { level1Index: level1Index },
                    leaf,
                );
            }
        }
    }
    private async updateMerkleTreesForRound1() {
        // Create reduce tree
        const lastActiveAction = await this.round1Model.findOne(
            {
                active: true,
            },
            {},
            { sort: { actionId: -1 } },
        );
        const round1s = lastActiveAction
            ? await this.round1ActionModel.find(
                  {
                      actionId: { $lte: lastActiveAction.actionId },
                  },
                  {},
                  { sort: { actionId: 1 } },
              )
            : [];
        round1s.map((action) => {
            this._round1.reducedActions.push(Field(action.currentActionState));
            this._round1.reduceState.updateLeaf(
                this._round1.reduceState.calculateIndex(
                    Field(action.currentActionState),
                ),
                this._round1.reduceState.calculateLeaf(
                    Number(ActionReduceStatusEnum.REDUCED),
                ),
            );
        });

        // Create contribution and publicKey tree
        const keyCounters: { _id: number; count: number }[] =
            await this.dkgModel.aggregate([
                {
                    $match: {
                        active: true,
                        actionEnum: DkgActionEnum.GENERATE_KEY,
                    },
                },
                {
                    $group: {
                        _id: '$committeeId',
                        count: { $count: {} },
                    },
                },
            ]);
        for (let i = 0; i < keyCounters.length; i++) {
            const keyCounter = keyCounters[i];
            const committeeId = keyCounter._id;
            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const key = await this.keyModel.findOne({
                    _id: Utilities.getKeyObjectId(committeeId, keyId),
                });
                const round1s = await this.round1Model.find({
                    committeeId: committeeId,
                    keyId: keyId,
                    active: true,
                });
                if (key.status >= KeyStatusEnum.ROUND_2_CONTRIBUTION) {
                    const level1IndexContribution =
                        this._round1.contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        });
                    const level1IndexPublicKey =
                        this._round1.publicKey.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        });
                    this._round1.contribution.updateInternal(
                        level1IndexContribution,
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    this._round1.publicKey.updateInternal(
                        level1IndexPublicKey,
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    for (let j = 0; j < round1s.length; j++) {
                        const round1 = round1s[j];
                        const tmp: Group[] = [];
                        for (let k = 0; k < round1.contribution.length; k++) {
                            tmp.push(
                                Group.from(
                                    round1.contribution[k].x,
                                    round1.contribution[k].y,
                                ),
                            );
                        }
                        const level2IndexContribution =
                            this._round1.contribution.calculateLevel2Index(
                                Field(round1.memberId),
                            );
                        const contributionLeaf =
                            this._round1.contribution.calculateLeaf(
                                new Libs.Committee.Round1Contribution({
                                    C: Libs.Committee.CArray.from(tmp),
                                }),
                            );
                        this._round1.contribution.updateLeaf(
                            {
                                level1Index: level1IndexContribution,
                                level2Index: level2IndexContribution,
                            },
                            contributionLeaf,
                        );
                        const level2IndexPublicKey =
                            this._round1.contribution.calculateLevel2Index(
                                Field(round1.memberId),
                            );
                        const publicKeyLeaf =
                            this._round1.publicKey.calculateLeaf(
                                Group.from(
                                    round1.contribution[0].x,
                                    round1.contribution[0].y,
                                ),
                            );
                        this._round1.publicKey.updateLeaf(
                            {
                                level1Index: level1IndexPublicKey,
                                level2Index: level2IndexPublicKey,
                            },
                            publicKeyLeaf,
                        );
                    }
                }
            }
        }
    }
    private async updateMerkleTreesForRound2() {
        // Create reduce tree
        const lastActiveAction = await this.round2Model.findOne(
            {
                active: true,
            },
            {},
            { sort: { actionId: -1 } },
        );
        const round1s = lastActiveAction
            ? await this.round2ActionModel.find(
                  {
                      actionId: { $lte: lastActiveAction.actionId },
                  },
                  {},
                  { sort: { actionId: 1 } },
              )
            : [];
        round1s.map((action) => {
            this._round2.reducedActions.push(Field(action.currentActionState));
            this._round2.reduceState.updateLeaf(
                this._round2.reduceState.calculateIndex(
                    Field(action.currentActionState),
                ),
                this._round2.reduceState.calculateLeaf(
                    Number(ActionReduceStatusEnum.REDUCED),
                ),
            );
        });

        // Create contribution and encryption tree
        const keyCounters: { _id: number; count: number }[] =
            await this.dkgModel.aggregate([
                {
                    $match: {
                        active: true,
                        actionEnum: DkgActionEnum.GENERATE_KEY,
                    },
                },
                {
                    $group: {
                        _id: '$committeeId',
                        count: { $count: {} },
                    },
                },
            ]);
        for (let i = 0; i < keyCounters.length; i++) {
            const keyCounter = keyCounters[i];
            const committeeId = keyCounter._id;
            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const key = await this.keyModel.findOne({
                    _id: committeeId + '_' + keyId,
                });
                const round2s = await this.round2Model.find(
                    {
                        committeeId: committeeId,
                        keyId: keyId,
                        active: true,
                    },
                    {},
                    { sort: { memberId: 1 } },
                );
                if (key.status >= KeyStatusEnum.ACTIVE) {
                    const level1IndexContribution =
                        this._round2.contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        });
                    const level1IndexEncryption =
                        this._round2.contribution.calculateLevel1Index({
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        });
                    this._round2.contribution.updateInternal(
                        level1IndexContribution,
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );
                    this._round2.encryption.updateInternal(
                        level1IndexEncryption,
                        Storage.DKGStorage.EMPTY_LEVEL_2_TREE(),
                    );

                    const contributions: Libs.Committee.Round2Contribution[] =
                        [];
                    for (let j = 0; j < round2s.length; j++) {
                        const round2 = round2s[j];
                        const tmp1: Bit255[] = [];
                        for (let k = 0; k < round2.contribution.u.length; k++) {
                            tmp1.push(
                                Bit255.fromBigInt(
                                    BigInt(round2.contribution.c[k]),
                                ),
                            );
                        }
                        const tmp2: Group[] = [];
                        for (let k = 0; k < round2.contribution.u.length; k++) {
                            tmp2.push(
                                Group.from(
                                    round2.contribution.u[k].x,
                                    round2.contribution.u[k].y,
                                ),
                            );
                        }
                        contributions.push(
                            new Libs.Committee.Round2Contribution({
                                c: Libs.Committee.cArray.from(tmp1),
                                U: Libs.Committee.UArray.from(tmp2),
                            }),
                        );
                    }
                    for (let j = 0; j < round2s.length; j++) {
                        const round2 = round2s[j];
                        const tmp1: Bit255[] = [];
                        for (let k = 0; k < round2.contribution.u.length; k++) {
                            tmp1.push(
                                Bit255.fromBigInt(
                                    BigInt(round2.contribution.c[k]),
                                ),
                            );
                        }
                        const tmp2: Group[] = [];
                        for (let k = 0; k < round2.contribution.u.length; k++) {
                            tmp2.push(
                                Group.from(
                                    round2.contribution.u[k].x,
                                    round2.contribution.u[k].y,
                                ),
                            );
                        }
                        const level2IndexContribution =
                            this._round2.contribution.calculateLevel2Index(
                                Field(round2.memberId),
                            );
                        const contributionLeaf =
                            this._round2.contribution.calculateLeaf(
                                contributions[j],
                            );
                        this._round2.contribution.updateLeaf(
                            {
                                level1Index: level1IndexContribution,
                                level2Index: level2IndexContribution,
                            },
                            contributionLeaf,
                        );
                        const level2IndexEncryption =
                            this._round2.contribution.calculateLevel2Index(
                                Field(round2.memberId),
                            );
                        const encryptionLeaf =
                            this._round2.encryption.calculateLeaf({
                                memberId: Field(round2.memberId),
                                contributions: contributions,
                            });
                        this._round2.encryption.updateLeaf(
                            {
                                level1Index: level1IndexEncryption,
                                level2Index: level2IndexEncryption,
                            },
                            encryptionLeaf,
                        );
                    }
                }
            }
        }
    }
}
