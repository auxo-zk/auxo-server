import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, MerkleTree, Reducer } from 'o1js';
import { Model, ObjectId } from 'mongoose';
import {
    DkgAction,
    DkgActionEnum,
    getDkg,
} from 'src/schemas/actions/dkg-action.schema';
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
import { Key, KeyStatus } from 'src/schemas/key.schema';
import { Constants, Storage } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';

@Injectable()
export class DkgService implements OnModuleInit {
    private readonly logger = new Logger(DkgService.name);
    private readonly dkg: {
        zkApp: Field;
        keyCounter: MerkleTree;
        keyStatus: MerkleTree;
    };
    private readonly round1: {
        zkApp: Field;
        reduceState: Field;
        contribution: MerkleTree;
        publicKey: MerkleTree;
    };
    private readonly round2: {
        zkApp: Field;
        reduceState: Field;
        contribution: MerkleTree;
        encryption: MerkleTree;
    };

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
    ) {
        this.dkg = {
            zkApp: Field(0),
            keyCounter: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
            keyStatus: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
        };
        this.round1 = {
            zkApp: Field(0),
            reduceState: Field(0),
            contribution: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
            publicKey: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
        };
        this.round2 = {
            zkApp: Field(0),
            reduceState: Field(0),
            contribution: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
            encryption: Storage.DKGStorage.EMPTY_LEVEL_1_TREE(),
        };
    }

    async onModuleInit() {
        await this.fetch();
        await this.createTreesForDkg();
    }

    async fetch() {
        // await this.fetchAllDkgActions();
        // await this.fetchAllRound1Actions();
        // await this.fetchAllRound2Actions();
        await this.updateKeys();
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllDkgActions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.DKG_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field(actions[actionsLength - 1].hash);
            promises.push(
                this.dkgActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateDkgs();
    }

    private async fetchAllRound1Actions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.ROUND_1_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field(actions[actionsLength - 1].hash);
            promises.push(
                this.round1ActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateRound1s();
    }

    private async fetchAllRound2Actions() {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.ROUND_2_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field(actions[actionsLength - 1].hash);
            promises.push(
                this.round2ActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
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
                const keyObjectId = Utilities.hash(committeeId + '_' + keyId);
                const existed = await this.keyModel.exists({
                    _id: keyObjectId,
                });
                if (!existed) {
                    await this.keyModel.create({
                        _id: keyObjectId,
                        committeeId: committeeId,
                        keyId: keyId,
                        status: KeyStatus.ROUND_1_CONTRIBUTION,
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
                    key.set('status', KeyStatus.DEPRECATED);
                } else {
                    const finalizedRound2 = await this.dkgModel.exists({
                        committeeId: committeeId,
                        keyId: keyId,
                        actionEnum: DkgActionEnum.FINALIZE_ROUND_2,
                    });
                    if (finalizedRound2) {
                        key.set('status', KeyStatus.ACTIVE);
                    } else {
                        const finalizedRound1 = await this.dkgModel.exists({
                            committeeId: committeeId,
                            keyId: keyId,
                            actionEnum: DkgActionEnum.FINALIZE_ROUND_1,
                        });
                        if (finalizedRound1) {
                            key.set('status', KeyStatus.ROUND_2_CONTRIBUTION);
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
            this.dkg.keyCounter.setLeaf(
                BigInt(keyCounter._id),
                Field(keyCounter.count),
            );
            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const keyObjectId = Utilities.hash(committeeId + '_' + keyId);
                const key = await this.keyModel.findOne({ _id: keyObjectId });
                this.dkg.keyStatus.setLeaf(
                    BigInt(committeeId * Constants.INSTANCE_LIMITS.KEY + keyId),
                    Field(key.status),
                );
            }
        }
    }
    private async createTreesForRound1() {}
    private async createTreesForRound2() {}
}
