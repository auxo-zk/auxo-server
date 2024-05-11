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
    calculatePublicKey,
    Constants,
    Libs,
    Round1Contribution,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Bit255 } from '@auxo-dev/auxo-libs';
import { Committee } from 'src/schemas/committee.schema';
import {
    ActionReduceStatusEnum,
    DkgActionEnum,
    DkgEventEnum,
    EventEnum,
    KeyStatusEnum,
    MaxRetries,
    zkAppCache,
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
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchDkgState(): Promise<DkgState> {
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

    async fetchRound1State(): Promise<Round1State> {
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

    async fetchRound2State(): Promise<Round2State> {
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
                    actions: action.actions[0].slice(1),
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

                    Promise.all(promises).then(async () => {
                        await notActiveAction.save();
                    });
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
                    if (
                        key.status == KeyStatusEnum.ROUND_2_CONTRIBUTION ||
                        key.status == KeyStatusEnum.ACTIVE
                    ) {
                        this._dkg.keyStorage.updateRawLeaf(
                            { level1Index },
                            PublicKey.fromBase58(key.key).toGroup(),
                        );

                        const round1s = key.round1s.sort(
                            (a, b) => a.memberId - b.memberId,
                        );
                        for (let k = 0; k < round1s.length; k++) {
                            const round1 = round1s[k];
                            const contribution: Group[] = [];
                            round1.contribution.map((point) => {
                                contribution.push(Group.from(point.x, point.y));
                            });

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
                                Group.from(
                                    round1.contribution[0].x,
                                    round1.contribution[0].y,
                                ),
                            );
                        }

                        if (key.status == KeyStatusEnum.ACTIVE) {
                            const round2s = key.round2s.sort(
                                (a, b) => a.memberId - b.memberId,
                            );
                            const contributions: Libs.Committee.Round2Contribution[] =
                                [];
                            for (let k = 0; k < round2s.length; k++) {
                                const round2 = round2s[k];
                                const c: Bit255[] = [];
                                round2.contribution.c.map((value) => {
                                    c.push(Bit255.fromBigInt(BigInt(value)));
                                });
                                const u: Group[] = [];
                                round2.contribution.u.map((point) => {
                                    u.push(Group.from(point.x, point.y));
                                });
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
            }
            await this.updateProcessStorageForDkg();
            await this.updateProcessStorageForRound1();
            await this.updateProcessStorageForRound2();
        } catch (err) {}
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
