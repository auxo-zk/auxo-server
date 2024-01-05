import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Group, MerkleTree, Provable, Reducer } from 'o1js';
import { Model, ObjectId } from 'mongoose';
import { DkgAction, getDkg } from 'src/schemas/actions/dkg-action.schema';
import { InjectModel, raw } from '@nestjs/mongoose';
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
import { Constants, Libs, Storage, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Round1Contribution } from '@auxo-dev/dkg/build/esm/src/libs/Committee';
import { Bit255 } from '@auxo-dev/auxo-libs';
import { Committee } from 'src/schemas/committee.schema';
import { DkgActionEnum, KeyStatusEnum } from 'src/constants';
import { Action } from 'src/interfaces/action.interface';

const KEY_STATUS_ARRAY = [
    'EMPTY',
    'ROUND_1_CONTRIBUTION',
    'ROUND_2_CONTRIBUTION',
    'ACTIVE',
    'DEPRECATED',
];
@Injectable()
export class DkgContractsService implements OnModuleInit {
    private readonly logger = new Logger(DkgContractsService.name);
    private readonly _dkg: {
        zkApp: Field;
        keyCounter: MerkleTree;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
    };
    private readonly _round1: {
        zkApp: Field;
        reduceState: Field;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
    };
    private readonly _round2: {
        zkApp: Field;
        reduceState: Field;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
    };

    public get dkg(): {
        zkApp: Field;
        keyCounter: MerkleTree;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
    } {
        return this._dkg;
    }

    public get round1(): {
        zkApp: Field;
        reduceState: Field;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
    } {
        return this._round1;
    }

    public get round2(): {
        zkApp: Field;
        reduceState: Field;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
    } {
        return this._round2;
    }

    constructor(
        private readonly queryService: QueryService,
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
            zkApp: Field(0),
            keyCounter: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
            keyStatus: new Storage.DKGStorage.KeyStatusStorage(),
        };
        this._round1 = {
            zkApp: Field(0),
            reduceState: Field(0),
            contribution: new Storage.DKGStorage.Round1ContributionStorage(),
            publicKey: new Storage.DKGStorage.PublicKeyStorage(),
        };
        this._round2 = {
            zkApp: Field(0),
            reduceState: Field(0),
            contribution: new Storage.DKGStorage.Round2ContributionStorage(),
            encryption: new Storage.DKGStorage.EncryptionStorage(),
        };
    }

    async onModuleInit() {
        await this.fetch();
        await this.createTreesForDkg();
        await this.createTreesForRound1();
        await this.createTreesForRound2();
    }

    async update() {
        await this.fetch();
        await this.createTreesForDkg();
        await this.createTreesForRound1();
        await this.createTreesForRound2();
    }

    private async fetch() {
        await this.fetchAllDkgActions();
        await this.fetchAllRound1Actions();
        await this.fetchAllRound2Actions();
        await this.updateKeys();
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllDkgActions() {
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
        await this.updateDkgs();
    }

    private async fetchAllRound1Actions() {
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
        await this.updateRound1s();
    }

    private async fetchAllRound2Actions() {
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
        await this.updateRound2s();
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
            // const lastEvent = rawEvents[rawEvents.length - 1].events;
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
            round2Actions = await this.round1ActionModel.find(
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
                    });
                    if (finalizedRound2) {
                        key.set('status', KeyStatusEnum.ACTIVE);
                    } else {
                        const finalizedRound1 = await this.dkgModel.exists({
                            committeeId: committeeId,
                            keyId: keyId,
                            actionEnum: DkgActionEnum.FINALIZE_ROUND_1,
                        });
                        if (finalizedRound1) {
                            key.set(
                                'status',
                                KeyStatusEnum.ROUND_2_CONTRIBUTION,
                            );
                        }
                    }
                }
                await key.save();
            }
        }
    }

    private async createTreesForDkg() {
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
            this._dkg.keyCounter.setLeaf(
                BigInt(keyCounter._id),
                Field(keyCounter.count),
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
                this._dkg.keyStatus.updateLeaf(leaf, level1Index);
            }
        }
    }
    private async createTreesForRound1() {
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
                            contributionLeaf,
                            level1IndexContribution,
                            level2IndexContribution,
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
                            publicKeyLeaf,
                            level1IndexPublicKey,
                            level2IndexPublicKey,
                        );
                    }
                }
            }
        }
    }
    private async createTreesForRound2() {
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
                            contributionLeaf,
                            level1IndexContribution,
                            level2IndexContribution,
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
                            encryptionLeaf,
                            level1IndexEncryption,
                            level2IndexEncryption,
                        );
                    }
                }
            }
        }
    }
}
